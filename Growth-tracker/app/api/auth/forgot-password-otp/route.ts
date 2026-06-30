// app/api/auth/forgot-password-otp/route.ts
// Custom OTP-based password reset: generates a 6-digit code,
// stores a hash in Supabase, and sends it via Resend.

import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

async function sendOTPEmail(email: string, otp: string) {
  const resendKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.EMAIL_FROM_ADDRESS

  if (!resendKey || !fromAddress) {
    throw new Error('Resend not configured. Check RESEND_API_KEY and EMAIL_FROM_ADDRESS.')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: email,
      subject: 'Your password reset code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h2>Password reset code</h2>
          <p>Use the code below to reset your password. It expires in 10 minutes.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; margin: 24px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend failed: ${res.status} ${body}`)
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find the user by email
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('[forgot-password-otp] listUsers error:', listError)
      return NextResponse.json(
        { error: `Auth lookup failed: ${listError.message}` },
        { status: 500 }
      )
    }

    const user = userList.users.find((u: { email?: string }) => u.email === email.trim())

    // Always return success so emails can't be enumerated
    if (!user) {
      return NextResponse.json({ success: true })
    }

    const otp = generateOTP()
    const otpHash = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Store the hashed OTP
    const { error: insertError } = await supabase
      .from('password_reset_otps')
      .insert({
        user_id: user.id,
        email: user.email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('[forgot-password-otp] insert error:', insertError)
      return NextResponse.json(
        { error: `Database error: ${insertError.message}. Make sure the password_reset_otps table exists.` },
        { status: 500 }
      )
    }

    // Always log the OTP for development visibility
    console.log(`\n[DEV OTP] Password reset code for ${user.email}: ${otp}\n`)

    try {
      await sendOTPEmail(user.email, otp)
    } catch (emailErr) {
      console.error('[forgot-password-otp] email failed:', emailErr)

      // In development, return the OTP so testing can continue without a working email provider
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          devOtp: otp,
          warning: 'Email provider failed. Use the devOtp code to test the reset flow.',
        })
      }

      throw emailErr
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forgot-password-otp] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error.' },
      { status: 500 }
    )
  }
}
