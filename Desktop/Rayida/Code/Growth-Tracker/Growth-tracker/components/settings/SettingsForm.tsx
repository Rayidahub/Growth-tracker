'use client'

// components/settings/SettingsForm.tsx
// Editable profile form — name, phase, GitHub, portfolio, LinkedIn.
// Saves directly to Supabase profiles table via client.

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Github, Globe, Linkedin, User, Loader2, Save } from 'lucide-react'
import type { Profile } from '@/types/database'

const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']

const settingsSchema = z.object({
  full_name:       z.string().min(1, 'Name is required').max(80),
  current_phase:   z.enum(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']),
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

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name:       profile?.full_name ?? '',
      current_phase:   (profile?.current_phase as SettingsFormValues['current_phase']) ?? 'Phase 1',
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

  return (
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
  )
}