'use client'

// components/auth/SignupForm.tsx
// Full-name + email + password signup with Google OAuth option

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

interface FormState {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const PASSWORD_MIN_LENGTH = 8

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

export function SignupForm() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const supabase = createClient()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null)
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    },
    []
  )

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    // Client-side validation
    if (!form.fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!form.email.trim()) {
      setError('Please enter your email address.')
      return
    }

    const passwordError = validatePassword(form.password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsEmailLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setError('An account with this email already exists. Try logging in.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.session) {
        // Email confirmation is disabled — user is already signed in
        setSuccessMessage('🎉 Account created! Redirecting you to the dashboard…')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        // Email confirmation is enabled
        setSuccessMessage(
          '🎉 Account created! Check your email for a confirmation link to activate your account.'
        )
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[SignupForm] Unexpected error:', err)
    } finally {
      setIsEmailLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setIsGoogleLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
    } catch (err) {
      setError('Failed to initiate Google signup. Please try again.')
      setIsGoogleLoading(false)
      console.error('[SignupForm] Google OAuth error:', err)
    }
  }

  const isLoading = isEmailLoading || isGoogleLoading

  // ── Password strength indicator ──────────────────────────
  const passwordStrength = (() => {
    const p = form.password
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (p.length >= 12) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][passwordStrength]
  const strengthColor = [
    '',
    'bg-red-500',
    'bg-orange-400',
    'bg-yellow-400',
    'bg-emerald-400',
    'bg-emerald-500',
  ][passwordStrength]

  return (
    <Card className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
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
          Start tracking your growth
        </CardTitle>
        <CardDescription className="text-slate-400">
          Create your AI-Aware Engineer account — it&apos;s free
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-8">
        {/* Error alert */}
        {error && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-500/30 bg-red-500/10 text-red-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success alert */}
        {successMessage && (
          <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">{successMessage}</AlertDescription>
          </Alert>
        )}

        {!successMessage && (
          <>
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 h-11"
              onClick={handleGoogleSignup}
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
                <span className="bg-transparent px-3 text-slate-500">or register with email</span>
              </div>
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleEmailSignup} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm text-slate-300">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Ada Lovelace"
                    value={form.fullName}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="name"
                    className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors"
                    required
                  />
                </div>
                {/* Strength bar */}
                {form.password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= passwordStrength ? strengthColor : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Strength:{' '}
                      <span
                        className={
                          passwordStrength >= 4 ? 'text-emerald-400' : 'text-slate-400'
                        }
                      >
                        {strengthLabel}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm text-slate-300">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={`h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors ${
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? 'border-red-500/50'
                        : ''
                    }`}
                    required
                  />
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-400">Passwords don&apos;t match</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-60"
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  'Create account'
                )}
              </Button>

              <p className="text-center text-xs text-slate-600">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="justify-center pb-8 px-8">
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

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
