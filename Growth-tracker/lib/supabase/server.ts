// lib/supabase/server.ts
// Server-side Supabase client — use in Server Components, Route Handlers, and Middleware
// Uses createServerClient from @supabase/ssr which handles cookie management

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables.\n' +
    'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  )
}

/**
 * Creates a Supabase client for use in Server Components and Route Handlers.
 * Reads/writes auth cookies via next/headers — must be called inside
 * a request context (Server Component, Route Handler, Server Action).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // The `setAll` method is called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

/**
 * Creates a Supabase client with the service role key (admin access).
 * ⚠️  NEVER expose this on the client. Use only in trusted server contexts.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      '❌ SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin operations.'
    )
  }

  // Dynamic import to avoid bundling on client
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
