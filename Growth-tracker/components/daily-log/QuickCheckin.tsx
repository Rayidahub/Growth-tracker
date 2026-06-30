'use client'

// components/daily-log/QuickCheckin.tsx
// Lightweight dashboard widget — 4 fields, submits in under 30 seconds.
// On successful save it shows a compact score summary and a link to the full form.

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import {
  Clock, Github, FileText, Zap, Loader2, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/Toast'
import { upsertDailyLog, getDailyLog, getTodayString } from '@/lib/supabase/dailyLogs'
import { quickCheckinSchema, type QuickCheckinValues } from '@/lib/validations/dailyLog'
import { cn } from '@/lib/utils'

interface QuickCheckinProps {
  userId: string
}

export function QuickCheckin({ userId }: QuickCheckinProps) {
  const { toast } = useToast()
  const today = getTodayString()

  const [submitted, setSubmitted] = useState(false)
  const [savedScore, setSavedScore] = useState<number | null>(null)
  const [existingLogId, setExistingLogId] = useState<string | null>(null)
  const [isCheckingToday, setIsCheckingToday] = useState(true)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickCheckinValues>({
    resolver: zodResolver(quickCheckinSchema),
    defaultValues: {
      log_date: today,
      deep_work_hours: 0,
      github_commits: 0,
      public_documentation_done: false,
      quick_total: 0,
    },
  })

  const quickTotal = watch('quick_total')

  // Check if today already has a log
  useEffect(() => {
    async function check() {
      const { data } = await getDailyLog(userId, today)
      if (data) {
        setExistingLogId(data.id)
        setSavedScore(data.total_score)
        setSubmitted(true)
        // Pre-fill with existing data
        setValue('deep_work_hours', data.deep_work_hours)
        setValue('github_commits', data.github_commits)
        setValue('public_documentation_done', data.public_documentation_done)
        setValue('quick_total', data.total_score)
      }
      setIsCheckingToday(false)
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, today])

  const onSubmit = async (values: QuickCheckinValues) => {
    // Build a minimal upsert payload — only quick fields + zeros for the rest
    const payload = {
      user_id: userId,
      log_date: values.log_date,
      deep_work_hours: values.deep_work_hours,
      github_commits: values.github_commits,
      public_documentation_done: values.public_documentation_done,
      // Distribute quick_total proportionally across score pillars
      // so the DB generated column equals quick_total as closely as possible
      coding_score: distributeScore(values.quick_total, 25),
      product_score: distributeScore(values.quick_total, 15),
      docs_score: distributeScore(values.quick_total, 15),
      brand_score: distributeScore(values.quick_total, 10),
      portfolio_score: distributeScore(values.quick_total, 15),
      discipline_score: distributeScore(values.quick_total, 10),
      health_score: distributeScore(values.quick_total, 10),
      // Defaults for the rest
      learn2earn_tasks_completed: [],
      frontend_topics: [],
      product_design_practice: [],
      portfolio_project_name: null,
      portfolio_progress_percent: 0,
      ai_tools_used: [],
      biggest_learning: '',
      biggest_challenge: '',
      bug_solved: '',
    }

    const { data, error } = await upsertDailyLog(payload)

    if (error) {
      toast({ variant: 'error', title: 'Check-in failed', description: error })
      return
    }

    if (data) {
      setExistingLogId(data.id)
      setSavedScore(data.total_score)
      setSubmitted(true)
      toast({
        variant: 'success',
        title: '✓ Check-in saved',
        description: `Score: ${data.total_score}/100 · ${today}`,
      })
    }
  }

  // ── Submitted state ──────────────────────────────────────
  if (submitted && !isCheckingToday) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Today's check-in done</p>
              <p className="text-xs text-slate-400">{today}</p>
            </div>
          </div>
          {savedScore !== null && (
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-400 tabular-nums">{savedScore}</div>
              <div className="text-xs text-slate-500">/ 100</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSubmitted(false)}
            className="text-xs text-slate-400 hover:text-white rounded-xl"
          >
            Edit check-in
          </Button>
          <Link
            href="/log"
            className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Open full log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────
  if (isCheckingToday) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm animate-pulse">
        <div className="h-5 w-40 rounded-md bg-white/10 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 rounded-xl bg-white/10" />
          <div className="h-16 rounded-xl bg-white/10" />
        </div>
      </div>
    )
  }

  // ── Form state ───────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20">
          <Zap className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Quick Check-in</p>
          <p className="text-xs text-slate-500">{today}</p>
        </div>
        <Link
          href="/log"
          className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          Full log <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        {/* Row 1: hours + commits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Deep Work
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                {...register('deep_work_hours', { valueAsNumber: true })}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white pr-10 text-sm focus:border-indigo-500 focus:ring-indigo-500/20"
                placeholder="0.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">h</span>
            </div>
            {errors.deep_work_hours && (
              <p className="text-xs text-red-400">{errors.deep_work_hours.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5" /> Commits
            </label>
            <Input
              type="number"
              min="0"
              {...register('github_commits', { valueAsNumber: true })}
              className="h-10 rounded-xl border-white/10 bg-white/5 text-white text-sm focus:border-indigo-500 focus:ring-indigo-500/20"
              placeholder="0"
            />
          </div>
        </div>

        {/* Row 2: Score slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Today's Score</label>
            <span className="text-sm font-bold text-indigo-400 tabular-nums">{quickTotal}<span className="text-xs font-normal text-slate-600"> /100</span></span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-150',
                quickTotal >= 80 ? 'from-emerald-600 to-emerald-400' :
                quickTotal >= 60 ? 'from-indigo-600 to-violet-400' :
                quickTotal >= 40 ? 'from-amber-600 to-amber-400' :
                'from-red-600 to-red-400'
              )}
              style={{ width: `${quickTotal}%` }}
            />
          </div>
          <Controller
            name="quick_total"
            control={control}
            render={({ field }) => (
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="score-range w-full cursor-pointer"
                aria-label="Today's total score"
              />
            )}
          />
        </div>

        {/* Row 3: Public docs checkbox */}
        <Controller
          name="public_documentation_done"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
                  field.value
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-white/20 bg-white/5 group-hover:border-white/40'
                )}
              >
                {field.value && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Public documentation done
              </span>
            </label>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-sm text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…</>
          ) : (
            <><Zap className="mr-2 h-3.5 w-3.5" /> Check in</>
          )}
        </Button>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Helper — proportionally spread a total score across a pillar
// ─────────────────────────────────────────────────────────────
function distributeScore(total: number, pillarMax: number): number {
  const GRAND_MAX = 100
  const raw = Math.round((total / GRAND_MAX) * pillarMax)
  return Math.min(raw, pillarMax)
}
