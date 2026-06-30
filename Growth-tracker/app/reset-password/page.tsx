// app/reset-password/page.tsx

import { type Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Create new password — ProductivityOS',
  description: 'Set a new password for your ProductivityOS account.',
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  )
}
