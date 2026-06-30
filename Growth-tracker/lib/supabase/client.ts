// lib/supabase/client.ts
// Browser-side Supabase client — safe to use in Client Components
// Uses createBrowserClient from @supabase/ssr with cookie storage so PKCE
// verifiers (needed for password reset, email confirmation, OAuth) survive
// page loads initiated from outside the app (e.g., email links).

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

function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {}

  return document.cookie.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [key, ...rest] = cookie.trim().split('=')
    if (key) acc[key] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}

function setCookie(name: string, value: string, options?: Record<string, unknown>) {
  if (typeof document === 'undefined') return

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

  if (options) {
    if (options.path) cookie += `; Path=${options.path}`
    if (typeof options.maxAge === 'number') cookie += `; Max-Age=${options.maxAge}`
    if (options.expires instanceof Date) cookie += `; Expires=${options.expires.toUTCString()}`
    if (options.domain) cookie += `; Domain=${options.domain}`
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
    if (options.secure) cookie += `; Secure`
  }

  document.cookie = cookie
}

function removeCookie(name: string, options?: Record<string, unknown>) {
  const removeOptions = { ...options, maxAge: 0 }
  setCookie(name, '', removeOptions)
}

/**
 * Creates a Supabase client for use in browser (Client Components).
 * Call this inside your component or hook — not at module scope —
 * to ensure a fresh client per render tree.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      get(name: string) {
        return parseCookies()[name]
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        setCookie(name, value, options)
      },
      remove(name: string, options: Record<string, unknown>) {
        removeCookie(name, options)
      },
    },
  })
}
