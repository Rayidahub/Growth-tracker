'use client'

// components/auth/ResetPasswordForm.tsx
// Handles Supabase password-reset callbacks.
// Supports both PKCE (?code=...) and legacy hash-token flows.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Loader2, Lock, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

const PASSWORD_MIN_LENGTH = 8

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
  return null
}

interface ResetLinkInfo {
  code: string | null
  isLegacy: boolean
  error: string | null
}

function getResetLinkInfo(): ResetLinkInfo {
  if (typeof window === 'undefined') {
    return { code: null, isLegacy: false, error: null }
  }

  const params = new URLSearchParams(window.location.search)
  const queryCode = params.get('code')
  const queryError = params.get('error')
  const queryErrorDescription = params.get('error_description')

  if (queryCode) {
    return { code: queryCode, isLegacy: false, error: null }
  }

  if (queryError) {
    return {
      code: null,
      isLegacy: false,
      error: queryErrorDescription || queryError,
    }
  }

  // Legacy flow: #access_token=...&refresh_token=...&type=recovery
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const type = hashParams.get('type')
  const accessToken = hashParams.get('access_token')
  if (type === 'recovery' && accessToken) {
    return { code: 'LEGACY_HASH_FLOW', isLegacy: true, error: null }
  }

  return { code: null, isLegacy: false, error: null }
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState<string | null>(null)
  const [isLegacyFlow, setIsLegacyFlow] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const { code: resetCode, isLegacy, error: linkError } = getResetLinkInfo()

    console.log('[ResetPasswordForm] URL:', window.location.href)
    console.log('[ResetPasswordForm] Reset code present:', !!resetCode)

    if (linkError) {
      setError(`Reset failed: ${linkError}. Please request a new link.`)
      return
    }

    if (isLegacy && resetCode === 'LEGACY_HASH_FLOW') {
      setIsLegacyFlow(true)
      setCode('LEGACY_HASH_FLOW')

      // For legacy hash flow, the Supabase client auto-parses the hash.
      // We just need to confirm we actually have a recovery session.
      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (sessionError || !data.session) {
          console.error('[ResetPasswordForm] Legacy session error:', sessionError)
          setError('Invalid or expired reset link. Please request a new one.')
        }
      })
      return
    }

    if (!resetCode) {
      setError(
        'Invalid reset link. Make sure the reset redirect URL is allowed in Supabase and request a new link.'
      )
      return
    }

    setCode(resetCode)
  }, [searchParams, supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      if (!isLegacyFlow) {
        // PKCE flow: exchange the code for a session first
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('[ResetPasswordForm] exchangeCodeForSession error:', exchangeError)
          setError(
            exchangeError.message.includes('expired')
              ? 'This reset link has expired. Please request a new one.'
              : 'This reset link is invalid. Please request a new one.'
          )
          return
        }
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        console.error('[ResetPasswordForm] updateUser error:', updateError)
        setError(updateError.message)
        return
      }

      setSuccess('Password updated successfully! Redirecting you to login…')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[ResetPasswordForm] Unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const linkMissing = !code && !isLegacyFlow

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
          Create new password
        </CardTitle>
        <CardDescription className="text-slate-400">
          Enter a new password for your account
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
            <AlertDescription className="text-sm">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm text-slate-300">
              New password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || linkMissing}
                autoComplete="new-password"
                className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors"
                required
              />
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
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || linkMissing}
                autoComplete="new-password"
                className={`h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 transition-colors ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500/50'
                    : ''
                }`}
                required
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords don&apos;t match</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || linkMissing}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center pb-8 px-8">
        <p className="text-sm text-slate-500">
          Back to{' '}
          <a
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl p-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        </Card>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
