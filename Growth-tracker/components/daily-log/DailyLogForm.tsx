'use client'

// components/daily-log/DailyLogForm.tsx
// Full daily log form with all fields, date picker, upsert logic,
// draft saving, inline validation, and live score total.

import { useEffect, useMemo, useCallback, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
  Save, Send, Clock, Code2, Palette, Github, FolderOpen,
  Bot, BookOpen, AlertTriangle, Bug, FileText, BarChart3,
  CalendarDays, ChevronDown, Loader2, RefreshCw, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/TagInput'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { ScoreSlider } from '@/components/ui/ScoreSlider'
import { useToast } from '@/components/ui/Toast'
import {
  upsertDailyLog,
  getDailyLog,
  saveDraft,
  loadDraft,
  clearDraft,
  getTodayString,
  toDateString,
} from '@/lib/supabase/dailyLogs'
import {
  dailyLogSchema,
  defaultDailyLogValues,
  FRONTEND_TOPIC_OPTIONS,
  PRODUCT_DESIGN_OPTIONS,
  AI_TOOL_OPTIONS,
  SCORE_CONFIG,
  TOTAL_MAX,
  type DailyLogFormValues,
} from '@/lib/validations/dailyLog'
import type { DailyLog } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface DailyLogFormProps {
  userId: string
  /** If provided, form pre-loads this log for editing */
  existingLog?: DailyLog | null
  /** Override the initial date (YYYY-MM-DD) */
  initialDate?: string
}

// ─────────────────────────────────────────────────────────────
// Section wrapper – collapsible card
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20 text-indigo-400">
          {icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-white">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-500 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && <div className="px-6 pb-6 space-y-5">{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Field wrapper – label + error
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-300">{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-600">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Total score ring
// ─────────────────────────────────────────────────────────────

function TotalScoreRing({ total, max }: { total: number; max: number }) {
  const pct = Math.round((total / max) * 100)
  const radius = 40
  const circ = 2 * Math.PI * radius
  const dash = (pct / 100) * circ

  const color =
    pct >= 80 ? '#34d399' :
    pct >= 60 ? '#818cf8' :
    pct >= 40 ? '#f59e0b' : '#f87171'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="text-center -mt-[68px] mb-[34px]">
        <div className="text-2xl font-black text-white tabular-nums">{total}</div>
        <div className="text-xs text-slate-500">/ {max}</div>
      </div>
      <span className="text-xs font-medium text-slate-400 mt-1">Total Score</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function DailyLogForm({ userId, existingLog, initialDate }: DailyLogFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const today = getTodayString()

  // ── react-hook-form setup ──────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: existingLog
      ? mapLogToFormValues(existingLog)
      : { ...defaultDailyLogValues, log_date: initialDate ?? today },
  })

  // ── State ──────────────────────────────────────────────────
  const [currentLogId, setCurrentLogId] = useState<string | null>(existingLog?.id ?? null)
  const [isLoadingDate, setIsLoadingDate] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  // ── Watch values ───────────────────────────────────────────
  const watchedDate = watch('log_date')
  const scores = watch([
    'coding_score', 'product_score', 'docs_score',
    'brand_score', 'portfolio_score', 'discipline_score', 'health_score',
  ])

  const totalScore = useMemo(
    () => scores.reduce((sum, v) => sum + (v ?? 0), 0),
    [scores]
  )

  // ── Load log when date changes ────────────────────────────
  useEffect(() => {
    if (!watchedDate || watchedDate === existingLog?.log_date) return
    let cancelled = false

    async function loadForDate() {
      setIsLoadingDate(true)
      const { data } = await getDailyLog(userId, watchedDate)
      if (cancelled) return

      if (data) {
        reset(mapLogToFormValues(data))
        setCurrentLogId(data.id)
        toast({ variant: 'info', title: 'Existing log loaded', description: `Editing log for ${watchedDate}` })
      } else {
        // Check for a draft
        const draft = loadDraft(userId, watchedDate)
        if (draft) {
          reset({ ...defaultDailyLogValues, ...draft, log_date: watchedDate } as DailyLogFormValues)
          setCurrentLogId(null)
          setHasDraft(true)
          toast({ variant: 'info', title: 'Draft restored', description: 'Your unsaved draft was loaded.' })
        } else {
          reset({ ...defaultDailyLogValues, log_date: watchedDate })
          setCurrentLogId(null)
          setHasDraft(false)
        }
      }
      setIsLoadingDate(false)
    }

    loadForDate()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDate, userId])

  // ── Check draft on mount ───────────────────────────────────
  useEffect(() => {
    const d = loadDraft(userId, watchedDate)
    setHasDraft(!!d)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save draft ────────────────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    const values = watch()
    saveDraft(userId, values.log_date, values)
    setHasDraft(true)
    toast({ variant: 'success', title: 'Draft saved', description: 'Your progress is saved locally.' })
  }, [userId, watch, toast])

  const handleDiscardDraft = useCallback(() => {
    clearDraft(userId, watchedDate)
    reset({ ...defaultDailyLogValues, log_date: watchedDate })
    setCurrentLogId(null)
    setHasDraft(false)
    toast({ variant: 'info', title: 'Draft discarded' })
  }, [userId, watchedDate, reset, toast])

  // ── Submit ────────────────────────────────────────────────
  const onSubmit = async (values: DailyLogFormValues) => {
    const payload = {
      user_id: userId,
      log_date: values.log_date,
      deep_work_hours: values.deep_work_hours,
      learn2earn_tasks_completed: values.learn2earn_tasks_completed,
      frontend_topics: values.frontend_topics,
      product_design_practice: values.product_design_practice,
      github_commits: values.github_commits,
      portfolio_project_name: values.portfolio_project_name,
      portfolio_progress_percent: values.portfolio_progress_percent,
      ai_tools_used: values.ai_tools_used,
      biggest_learning: values.biggest_learning,
      biggest_challenge: values.biggest_challenge,
      bug_solved: values.bug_solved,
      public_documentation_done: values.public_documentation_done,
      coding_score: values.coding_score,
      product_score: values.product_score,
      docs_score: values.docs_score,
      brand_score: values.brand_score,
      portfolio_score: values.portfolio_score,
      discipline_score: values.discipline_score,
      health_score: values.health_score,
    }

    const { data, error } = await upsertDailyLog(payload)

    if (error) {
      toast({ variant: 'error', title: 'Save failed', description: error })
      return
    }

    if (data) {
      setCurrentLogId(data.id)
      clearDraft(userId, values.log_date)
      setHasDraft(false)
      toast({
        variant: 'success',
        title: currentLogId ? 'Log updated ✓' : 'Log saved ✓',
        description: `${values.log_date} · Total score: ${totalScore}/${TOTAL_MAX}`,
      })
      router.refresh()
    }
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Header bar ───────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {currentLogId ? 'Edit Daily Log' : 'New Daily Log'}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {currentLogId ? 'Updating existing entry' : 'Create a new entry'} · Score auto-calculates
            </p>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            {isLoadingDate && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                type="date"
                max={today}
                {...register('log_date')}
                className="h-10 rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Draft banner */}
        {hasDraft && !currentLogId && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2">
            <p className="text-xs text-amber-300">
              📝 You have an unsaved draft for this date.
            </p>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs text-amber-400 hover:text-amber-200 transition-colors flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
          </div>
        )}

        {errors.log_date && (
          <p className="mt-2 text-xs text-red-400">{errors.log_date.message}</p>
        )}
      </div>

      {/* ── Activity ─────────────────────────────────────── */}
      <Section title="Activity & Work" icon={<Clock className="h-4 w-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Deep Work Hours" error={errors.deep_work_hours?.message} hint="Hours of uninterrupted focus">
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                {...register('deep_work_hours', { valueAsNumber: true })}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white pr-12 focus:border-indigo-500 focus:ring-indigo-500/20"
                placeholder="0.0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">hrs</span>
            </div>
          </Field>

          <Field label="GitHub Commits" error={errors.github_commits?.message}>
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="number"
                min="0"
                {...register('github_commits', { valueAsNumber: true })}
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white pl-9 focus:border-indigo-500 focus:ring-indigo-500/20"
                placeholder="0"
              />
            </div>
          </Field>
        </div>

        <Field label="Learn2Earn Tasks" hint="Type a task and press Enter or comma to add">
          <Controller
            name="learn2earn_tasks_completed"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="e.g. Completed React module, Read MDN docs…"
              />
            )}
          />
        </Field>
      </Section>

      {/* ── Frontend & Design ────────────────────────────── */}
      <Section title="Frontend & Design Practice" icon={<Code2 className="h-4 w-4" />}>
        <Field label="Frontend Topics Covered">
          <Controller
            name="frontend_topics"
            control={control}
            render={({ field }) => (
              <ChipSelect
                options={FRONTEND_TOPIC_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="Product Design Practice">
          <Controller
            name="product_design_practice"
            control={control}
            render={({ field }) => (
              <ChipSelect
                options={PRODUCT_DESIGN_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </Section>

      {/* ── Portfolio ─────────────────────────────────────── */}
      <Section title="Portfolio Project" icon={<FolderOpen className="h-4 w-4" />} defaultOpen={false}>
        <Field label="Project Name" error={errors.portfolio_project_name?.message}>
          <div className="relative">
            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              {...register('portfolio_project_name')}
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white pl-9 focus:border-indigo-500 focus:ring-indigo-500/20"
              placeholder="e.g. ProductivityOS, Portfolio v2…"
            />
          </div>
        </Field>

        <Field label={`Progress: ${watch('portfolio_progress_percent')}%`}>
          <Controller
            name="portfolio_progress_percent"
            control={control}
            render={({ field }) => (
              <div className="space-y-2 pt-1">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-150"
                    style={{ width: `${field.value}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="score-range w-full cursor-pointer"
                  aria-label="Portfolio progress percent"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            )}
          />
        </Field>
      </Section>

      {/* ── AI Tools ─────────────────────────────────────── */}
      <Section title="AI Tools Used" icon={<Bot className="h-4 w-4" />} defaultOpen={false}>
        <Field label="Which AI tools did you use today?">
          <Controller
            name="ai_tools_used"
            control={control}
            render={({ field }) => (
              <ChipSelect
                options={AI_TOOL_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </Section>

      {/* ── Reflections ──────────────────────────────────── */}
      <Section title="Reflections" icon={<BookOpen className="h-4 w-4" />} defaultOpen={false}>
        <Field label="Biggest Learning" hint="What's the most important thing you learned today?">
          <textarea
            {...register('biggest_learning')}
            rows={3}
            placeholder="Today I learned that…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 resize-none"
          />
        </Field>

        <Field label="Biggest Challenge">
          <textarea
            {...register('biggest_challenge')}
            rows={3}
            placeholder="I struggled with…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 resize-none"
          />
        </Field>

        <Field label="Bug Solved">
          <div className="relative">
            <Bug className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <textarea
              {...register('bug_solved')}
              rows={2}
              placeholder="Fixed a bug where…"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 resize-none"
            />
          </div>
        </Field>

        <Controller
          name="public_documentation_done"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all',
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
              <div>
                <p className="text-sm font-medium text-slate-300">Public Documentation Done</p>
                <p className="text-xs text-slate-600">Blog post, tweet, LinkedIn update, or thread</p>
              </div>
            </label>
          )}
        />
      </Section>

      {/* ── Scores ──────────────────────────────────────── */}
      <Section title="Daily Scores" icon={<BarChart3 className="h-4 w-4" />}>
        {/* Total score ring at top */}
        <div className="flex justify-center pt-2 pb-4">
          <TotalScoreRing total={totalScore} max={TOTAL_MAX} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {SCORE_CONFIG.map(({ key, label, max, color }) => (
            <Controller
              key={key}
              name={key}
              control={control}
              render={({ field }) => (
                <div>
                  <ScoreSlider
                    label={label}
                    value={field.value ?? 0}
                    max={max}
                    color={color}
                    onChange={field.onChange}
                  />
                  {errors[key] && (
                    <p className="mt-1 text-xs text-red-400">{errors[key]?.message}</p>
                  )}
                </div>
              )}
            />
          ))}
        </div>

        {/* Score breakdown table */}
        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="font-semibold text-slate-400 col-span-2">Pillar</div>
            <div className="font-semibold text-slate-400 text-right">Score</div>
            <div className="font-semibold text-slate-400 text-right">Max</div>
            {SCORE_CONFIG.map(({ key, label, max }) => {
              const v = watch(key) ?? 0
              return (
                <>
                  <div key={`${key}-label`} className="col-span-2 text-slate-300">{label}</div>
                  <div key={`${key}-val`} className="text-right font-mono text-white">{v}</div>
                  <div key={`${key}-max`} className="text-right text-slate-600">{max}</div>
                </>
              )
            })}
            <div className="col-span-2 border-t border-white/10 pt-2 font-bold text-white">Total</div>
            <div className="border-t border-white/10 pt-2 text-right font-bold font-mono text-indigo-400">{totalScore}</div>
            <div className="border-t border-white/10 pt-2 text-right text-slate-500">{TOTAL_MAX}</div>
          </div>
        </div>
      </Section>

      {/* ── Action buttons ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-8">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-60"
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> {currentLogId ? 'Update Log' : 'Save Log'}</>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting || !isDirty}
          className="h-12 rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>

        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset()
              toast({ variant: 'info', title: 'Form reset' })
            }}
            className="h-12 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        )}
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────
// Utility — map DB row → form values
// ─────────────────────────────────────────────────────────────

function mapLogToFormValues(log: DailyLog): DailyLogFormValues {
  return {
    log_date: log.log_date,
    deep_work_hours: log.deep_work_hours,
    learn2earn_tasks_completed: log.learn2earn_tasks_completed ?? [],
    frontend_topics: log.frontend_topics ?? [],
    product_design_practice: log.product_design_practice ?? [],
    github_commits: log.github_commits,
    portfolio_project_name: log.portfolio_project_name ?? null,
    portfolio_progress_percent: log.portfolio_progress_percent,
    ai_tools_used: log.ai_tools_used ?? [],
    biggest_learning: log.biggest_learning ?? '',
    biggest_challenge: log.biggest_challenge ?? '',
    bug_solved: log.bug_solved ?? '',
    public_documentation_done: log.public_documentation_done,
    coding_score: log.coding_score,
    product_score: log.product_score,
    docs_score: log.docs_score,
    brand_score: log.brand_score,
    portfolio_score: log.portfolio_score,
    discipline_score: log.discipline_score,
    health_score: log.health_score,
  }
}
