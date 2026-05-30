// app/login/page.tsx
import { Suspense } from 'react'
import { type Metadata } from 'next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthLoadingSkeleton } from '@/components/auth/AuthLoadingSkeleton'

export const metadata: Metadata = {
  title: 'Sign in — ProductivityOS',
  description: 'Sign in to your AI-Aware Engineer productivity dashboard.',
}

export default function LoginPage() {
  return (
    <AuthLayout>
      {/* Suspense required because LoginForm reads useSearchParams() */}
      <Suspense fallback={<AuthLoadingSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
