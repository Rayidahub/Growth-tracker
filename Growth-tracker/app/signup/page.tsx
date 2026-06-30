// app/signup/page.tsx
import { Suspense } from 'react'
import { type Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignupForm } from '@/components/auth/SignupForm'
import { AuthLoadingSkeleton } from '@/components/auth/AuthLoadingSkeleton'

export const metadata: Metadata = {
  title: 'Create account — ProductivityOS',
  description: 'Create your free AI-Aware Engineer productivity account.',
}

export default function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<AuthLoadingSkeleton />}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  )
}
