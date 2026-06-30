// app/forgot-password-otp/page.tsx
// Custom OTP-based password reset flow.
// Step 1: enter email → request OTP.
// Step 2: enter OTP + new password → reset.

import { type Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ForgotPasswordOTPForm } from '@/components/auth/ForgotPasswordOTPForm'

export const metadata: Metadata = {
  title: 'Reset password with code — ProductivityOS',
  description: 'Reset your ProductivityOS password using a one-time code sent to your email.',
}

export default function ForgotPasswordOTPPage() {
  return (
    <AuthLayout>
      <ForgotPasswordOTPForm />
    </AuthLayout>
  )
}
