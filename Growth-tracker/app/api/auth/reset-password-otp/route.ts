// app/api/auth/reset-password-otp/route.ts
// Verifies the OTP and updates the user's password via admin client.

import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and new password are required.' }, { status: 400 })
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Find user
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('[reset-password-otp] listUsers error:', listError)
      return NextResponse.json(
        { error: `Auth lookup failed: ${listError.message}` },
        { status: 500 }
      )
    }

    const user = userList.users.find((u: { email?: string }) => u.email === email.trim())

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
    }

    // Find the latest unused OTP
    const { data: otpRows, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq('user_id', user.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (otpError) {
      console.error('[reset-password-otp] select error:', otpError)
      return NextResponse.json(
        { error: `Database error: ${otpError.message}. Make sure the password_reset_otps table exists.` },
        { status: 500 }
      )
    }

    const otpRow = otpRows?.[0]

    if (!otpRow || otpRow.otp_hash !== hashOTP(otp)) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[reset-password-otp] updateUserById error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Mark OTP as used
    await supabase
      .from('password_reset_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRow.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password-otp] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error.' },
      { status: 500 }
    )
  }
}
