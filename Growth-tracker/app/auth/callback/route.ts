// app/auth/callback/route.ts
// Handles Supabase OAuth and email-confirmation callbacks (PKCE flow).
// Exchanges the temporary code for a session, then redirects the user.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  // Fallback: send user back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth-callback-error`)
}
