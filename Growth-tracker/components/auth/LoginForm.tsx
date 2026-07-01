'use client'

// components/auth/LoginForm.tsx
// Email/password login + Google OAuth
// Design: deep slate-to-indigo gradient background, rounded-2xl cards, gradient buttons

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, AlertCircle, Zap } from 'lucide-react'

interface FormState {
  email: string
  password: string
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const urlError = searchParams.get('error')

  const [form, setForm] = useState<FormState>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(urlError)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isResendLoading, setIsResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      setResendSuccess(null)
      setIsEmailNotConfirmed(false)
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    },
    []
  )

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResendSuccess(null)
    setIsEmailNotConfirmed(false)

    if (!form.email || !form.password) {
      setError('Please enter your email and password.')
      return
    }

    setIsEmailLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })

      if (authError) {
        // Map common Supabase errors to friendly messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('Incorrect email or password. Please try again.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before logging in.')
          setIsEmailNotConfirmed(true)
        } else {
          setError(authError.message)
        }
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[LoginForm] Unexpected error:', err)
    } finally {
      setIsEmailLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setError(null)
    setResendSuccess(null)

    if (!form.email.trim()) {
      setError('Please enter your email address first.')
      return
    }

    setIsResendLoading(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: form.email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (resendError) {
        setError(resendError.message)
        console.error('[LoginForm] Resend confirmation error:', resendError.message)
        return
      }

      setResendSuccess('Confirmation email resent! Check your inbox and spam folder.')
      setResendCooldown(60)
    } catch (err) {
      setError('Failed to resend confirmation email. Please try again.')
      console.error('[LoginForm] Resend confirmation unexpected error:', err)
    } finally {
      setIsResendLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setIsGoogleLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setIsGoogleLoading(false)
      }
      // On success, the user is redirected — no need to setIsGoogleLoading(false)
    } catch (err) {
      setError('Failed to initiate Google login. Please try again.')
      setIsGoogleLoading(false)
      console.error('[LoginForm] Google OAuth error:', err)
    }
  }

  const isLoading = isEmailLoading || isGoogleLoading

  return (
    <Card className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <CardHeader className="space-y-1 pb-6 pt-8 px-8">
        {/* Logo mark */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-indigo-300 uppercase">
            ProductivityOS
          </span>
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          Welcome back
        </CardTitle>
        <CardDescription className="text-slate-400">
          Sign in to your engineer dashboard
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-8">
        {/* Error / success alerts */}
        {error && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-500/30 bg-red-500/10 text-red-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {resendSuccess && (
          <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-sm">{resendSuccess}</AlertDescription>
          </Alert>
        )}

        {isEmailNotConfirmed && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResendConfirmation}
            disabled={isResendLoading || !form.email.trim() || resendCooldown > 0}
            className="w-full rounded-xl border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all duration-200 h-11"
          >
            {isResendLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : resendCooldown > 0 ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend available in {resendCooldown}s
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend confirmation email
              </>
            )}
          </Button>
        )}

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 h-11"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-transparent px-3 text-slate-500">or continue with email</span>
          </div>
        </div>

        {/* Email / Password form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-slate-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="email"
                className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm text-slate-300">
                Password
              </Label>
              <Link
                href="/forgot-password-otp"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="current-password"
                className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-60"
          >
            {isEmailLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center pb-8 px-8">
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create one free
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

// ── Inline Google SVG icon (avoids extra dependency) ──────────────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
