'use client'

// components/settings/SettingsForm.tsx
// Editable profile form — name, phase, GitHub, portfolio, LinkedIn.
// Saves directly to Supabase profiles table via client.

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Github, Globe, Linkedin, User, CalendarDays, Loader2, Save, Lock, KeyRound, Eye, EyeOff } from 'lucide-react'
import { StackSelector } from './StackSelector'
import type { Profile } from '@/types/database'

const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']

const settingsSchema = z.object({
  full_name:       z.string().min(1, 'Name is required').max(80),
  current_phase:   z.enum(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']),
  start_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  learning_stacks: z.array(z.string()).default([]),
  github_username: z.string().max(39).nullable().optional(),
  portfolio_url:   z.string().url('Enter a valid URL').or(z.literal('')).nullable().optional(),
  linkedin_url:    z.string().url('Enter a valid URL').or(z.literal('')).nullable().optional(),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

interface SettingsFormProps {
  userId: string
  profile: Profile | null
}

export function SettingsForm({ userId, profile }: SettingsFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [isVerifyingCurrentPassword, setIsVerifyingCurrentPassword] = useState(false)
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name:       profile?.full_name ?? '',
      current_phase:   (profile?.current_phase as SettingsFormValues['current_phase']) ?? 'Phase 1',
      start_date:      profile?.start_date ?? new Date().toISOString().slice(0, 10),
      learning_stacks: profile?.learning_stacks ?? [],
      github_username: profile?.github_username ?? '',
      portfolio_url:   profile?.portfolio_url ?? '',
      linkedin_url:    profile?.linkedin_url ?? '',
    },
  })

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:       values.full_name,
        current_phase:   values.current_phase,
        start_date:      values.start_date,
        learning_stacks: values.learning_stacks,
        github_username: values.github_username || null,
        portfolio_url:   values.portfolio_url || null,
        linkedin_url:    values.linkedin_url || null,
      })
      .eq('id', userId)

    setIsSaving(false)

    if (error) {
      toast({ variant: 'error', title: 'Save failed', description: error.message })
    } else {
      toast({ variant: 'success', title: 'Profile updated ✓' })
    }
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
    return null
  }

  const verifyCurrentPassword = async () => {
    if (!passwordData.currentPassword) return

    setIsVerifyingCurrentPassword(true)
    setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }))

    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email

    if (!email) {
      setPasswordErrors((prev) => ({ ...prev, currentPassword: 'Unable to verify password. Please try again.' }))
      setIsVerifyingCurrentPassword(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordData.currentPassword,
    })

    if (error) {
      setCurrentPasswordVerified(false)
      setPasswordErrors((prev) => ({ ...prev, currentPassword: 'Current password is incorrect.' }))
    } else {
      setCurrentPasswordVerified(true)
    }

    setIsVerifyingCurrentPassword(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors({})

    const errors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required.'
    }

    const passwordError = validatePassword(passwordData.newPassword)
    if (passwordError) {
      errors.newPassword = passwordError
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsChangingPassword(true)
    const supabase = createClient()

    try {
      // Re-authenticate the user with their current password if not already verified
      if (!currentPasswordVerified) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: (await supabase.auth.getUser()).data.user?.email ?? '',
          password: passwordData.currentPassword,
        })

        if (signInError) {
          setPasswordErrors({ currentPassword: 'Current password is incorrect.' })
          setIsChangingPassword(false)
          return
        }
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (updateError) {
        toast({ variant: 'error', title: 'Password change failed', description: updateError.message })
      } else {
        toast({ variant: 'success', title: 'Password updated ✓' })
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setCurrentPasswordVerified(false)
      }
    } catch (err) {
      toast({ variant: 'error', title: 'Password change failed', description: 'An unexpected error occurred.' })
      console.error('[SettingsForm] Password change error:', err)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm space-y-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile</p>

      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-sm text-slate-300">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            {...register('full_name')}
            className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white focus:border-indigo-500"
            placeholder="Your name"
          />
        </div>
        {errors.full_name && <p className="text-xs text-red-400">{errors.full_name.message}</p>}
      </div>

      {/* Phase selector */}
      <div className="space-y-1.5">
        <Label className="text-sm text-slate-300">Current Phase</Label>
        <div className="flex gap-2 flex-wrap">
          {PHASES.map((phase) => (
            <label key={phase} className="cursor-pointer">
              <input type="radio" value={phase} {...register('current_phase')} className="sr-only" />
              <span className={`
                inline-flex items-center rounded-xl border px-3 py-1.5 text-sm font-medium transition-all
                peer-checked:border-indigo-500 peer-checked:bg-indigo-500/20 peer-checked:text-indigo-300
              `}>
                {phase}
              </span>
            </label>
          ))}
        </div>
        {/* Visible chip select using watch */}
        <div className="flex gap-2 flex-wrap -mt-1">
          {PHASES.map((phase) => (
            <label key={phase} className="cursor-pointer">
              <input type="radio" value={phase} {...register('current_phase')} className="sr-only peer" />
            </label>
          ))}
        </div>
      </div>

      {/* Start date */}
      <div className="space-y-1.5">
        <Label className="text-sm text-slate-300">Start Date</Label>
        <p className="text-xs text-slate-600">Used to calculate your journey day and analytics timeline</p>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="date"
            {...register('start_date')}
            className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white focus:border-indigo-500 [color-scheme:dark]"
          />
        </div>
        {errors.start_date && <p className="text-xs text-red-400">{errors.start_date.message}</p>}
      </div>

      {/* Learning stacks */}
      <div className="space-y-2">
        <div>
          <Label className="text-sm text-slate-300">Learning Stacks</Label>
          <p className="text-xs text-slate-600">
            Pick the technologies and areas you want to learn. Your 96-week roadmap is built from these choices.
          </p>
        </div>
        <Controller
          name="learning_stacks"
          control={control}
          render={({ field }) => (
            <StackSelector selected={field.value ?? []} onChange={field.onChange} />
          )}
        />
        {errors.learning_stacks && <p className="text-xs text-red-400">{errors.learning_stacks.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* GitHub */}
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">GitHub Username</Label>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              {...register('github_username')}
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white focus:border-indigo-500"
              placeholder="yourusername"
            />
          </div>
          {errors.github_username && <p className="text-xs text-red-400">{errors.github_username.message}</p>}
        </div>

        {/* LinkedIn */}
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">LinkedIn URL</Label>
          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              {...register('linkedin_url')}
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white focus:border-indigo-500"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          {errors.linkedin_url && <p className="text-xs text-red-400">{errors.linkedin_url.message}</p>}
        </div>
      </div>

      {/* Portfolio */}
      <div className="space-y-1.5">
        <Label className="text-sm text-slate-300">Portfolio URL</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            {...register('portfolio_url')}
            className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 text-white focus:border-indigo-500"
            placeholder="https://yourportfolio.com"
          />
        </div>
        {errors.portfolio_url && <p className="text-xs text-red-400">{errors.portfolio_url.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSaving || !isDirty}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-50"
      >
        {isSaving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Save Changes</>
        )}
      </Button>
    </form>

    {/* Password change */}
    <form
      onSubmit={handlePasswordChange}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm space-y-5"
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security</p>

      {/* Current password */}
      <div className="space-y-1.5">
        <Label className="text-sm text-slate-300">Current Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type={passwordVisibility.currentPassword ? 'text' : 'password'}
            value={passwordData.currentPassword}
            onChange={(e) => {
              setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
              setCurrentPasswordVerified(false)
            }}
            onBlur={verifyCurrentPassword}
            className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 pr-10 text-white focus:border-indigo-500"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() =>
              setPasswordVisibility((prev) => ({ ...prev, currentPassword: !prev.currentPassword }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            tabIndex={-1}
          >
            {passwordVisibility.currentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {isVerifyingCurrentPassword && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Verifying current password…
          </p>
        )}
        {passwordErrors.currentPassword && <p className="text-xs text-red-400">{passwordErrors.currentPassword}</p>}
        {currentPasswordVerified && !passwordErrors.currentPassword && (
          <p className="text-xs text-emerald-400">Current password verified.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* New password */}
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type={passwordVisibility.newPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 pr-10 text-white focus:border-indigo-500"
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() =>
                setPasswordVisibility((prev) => ({ ...prev, newPassword: !prev.newPassword }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {passwordVisibility.newPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {passwordErrors.newPassword && <p className="text-xs text-red-400">{passwordErrors.newPassword}</p>}
        </div>

        {/* Confirm new password */}
        <div className="space-y-1.5">
          <Label className="text-sm text-slate-300">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type={passwordVisibility.confirmPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-9 pr-10 text-white focus:border-indigo-500"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() =>
                setPasswordVisibility((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {passwordVisibility.confirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {passwordErrors.confirmPassword && <p className="text-xs text-red-400">{passwordErrors.confirmPassword}</p>}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isChangingPassword}
        className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-50"
      >
        {isChangingPassword ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</>
        ) : (
          <><Lock className="mr-2 h-4 w-4" /> Change Password</>
        )}
      </Button>
    </form>
    </>
  )
}