// lib/supabase/client.ts
// Browser-side Supabase client — safe to use in Client Components
// Uses createBrowserClient from @supabase/ssr

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Validate env vars at module load time (fails fast during dev)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables.\n' +
    'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  )
}

/**
 * Creates a Supabase client for use in browser (Client Components).
 * Call this inside your component or hook — not at module scope —
 * to ensure a fresh client per render tree.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}
