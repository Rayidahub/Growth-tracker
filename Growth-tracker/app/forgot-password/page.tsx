// app/forgot-password/page.tsx

import { type Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset password — ProductivityOS',
  description: 'Request a password reset link for your ProductivityOS account.',
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
