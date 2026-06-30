'use client'

// components/auth/ForgotPasswordForm.tsx
// Requests a Supabase password reset email

import { useState, useEffect } from 'react'
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
import { Loader2, Mail, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

function mapResetError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many reset attempts. Please wait a minute before trying again.'
  }
  if (lower.includes('user not found') || lower.includes('email not found')) {
    return 'No account found with that email address.'
  }
  if (lower.includes('invalid redirect')) {
    return 'Reset redirect URL is not configured correctly. Please contact support.'
  }
  return message
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before requesting another reset link.`)
      return
    }

    setIsLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) {
        console.error('[ForgotPasswordForm] resetPasswordForEmail error:', resetError)
        setError(mapResetError(resetError.message))
        if (resetError.message.toLowerCase().includes('rate limit')) {
          setCooldown(60)
        }
        return
      }

      setSuccess(
        'Password reset link sent! Check your email and follow the instructions.'
      )
      setEmail('')
      setCooldown(60)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('[ForgotPasswordForm] Unexpected error:', err)
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
          Reset your password
        </CardTitle>
        <CardDescription className="text-slate-400">
          Enter your email and we&apos;ll send you a reset link
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
            disabled={isLoading || cooldown > 0}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link…
              </>
            ) : cooldown > 0 ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Try again in {cooldown}s
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send reset link
              </>
            )}
          </Button>
        </form>
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
