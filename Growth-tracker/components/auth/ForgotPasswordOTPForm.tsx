'use client'

// components/auth/ForgotPasswordOTPForm.tsx
// Two-step OTP password reset: request code, then verify + reset.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2, Zap, Eye, EyeOff } from 'lucide-react'

const PASSWORD_MIN_LENGTH = 8

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

export function ForgotPasswordOTPForm() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const startCooldown = () => {
    setCooldown(60)
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send reset code.')
        return
      }

      if (data.devOtp) {
        setDevOtp(data.devOtp)
        setSuccess('Email provider failed. Use the code below to test the reset flow.')
      } else {
        setSuccess('Reset code sent! Check your email and spam folder.')
      }

      setStep('reset')
      startCooldown()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[ForgotPasswordOTPForm] request OTP error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (cooldown > 0) return
    await handleRequestOTP({ preventDefault: () => {} } as React.FormEvent)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!otp.trim()) {
      setError('Please enter the reset code.')
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reset password.')
        return
      }

      setSuccess('Password reset successfully! Redirecting you to login…')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[ForgotPasswordOTPForm] reset password error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-6 pt-8 px-8">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-indigo-300 uppercase">
            ProductivityOS
          </span>
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          {step === 'email' ? 'Reset your password' : 'Enter reset code'}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {step === 'email'
            ? 'We\'ll send a 6-digit code to your email'
            : `Code sent to ${email}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-8">
        {error && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-500/30 bg-red-500/10 text-red-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {success}
              {devOtp && (
                <div className="mt-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-center text-lg font-mono font-bold tracking-[0.3em]">
                  {devOtp}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code…
                </>
              ) : (
                'Send reset code'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp" className="text-sm text-slate-300">
                Reset code
              </Label>
              <Input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors text-center tracking-[0.5em] text-lg"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm text-slate-300">
                New password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm text-slate-300">
                Confirm new password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={`h-11 rounded-xl border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-500/50'
                      : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords don&apos;t match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleResendOTP}
              disabled={isLoading || cooldown > 0}
              className="h-11 w-full rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center pb-8 px-8">
        <p className="text-sm text-slate-500">
          Remember your password?{' '}
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
