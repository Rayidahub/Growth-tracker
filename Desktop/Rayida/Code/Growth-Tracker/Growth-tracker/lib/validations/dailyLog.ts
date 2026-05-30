// lib/validations/dailyLog.ts
// Zod schema for the daily log form — mirrors the DB constraints exactly.

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Constants — single source of truth for options & maxes
// ─────────────────────────────────────────────────────────────

export const FRONTEND_TOPIC_OPTIONS = [
  'React',
  'Next.js',
  'Tailwind',
  'TypeScript',
  'JavaScript',
  'APIs',
  'Git/GitHub',
  'Other',
] as const

export const PRODUCT_DESIGN_OPTIONS = [
  'Figma',
  'UX flows',
  'Case study',
  'UI research',
  'Other',
] as const

export const AI_TOOL_OPTIONS = [
  'ChatGPT',
  'Claude',
  'Cursor',
  'Copilot',
  'Gemini',
  'None',
] as const

export const SCORE_CONFIG = [
  { key: 'coding_score',    label: 'Coding',     max: 25, color: 'indigo'   },
  { key: 'product_score',   label: 'Product',    max: 15, color: 'violet'   },
  { key: 'docs_score',      label: 'Docs',       max: 15, color: 'blue'     },
  { key: 'brand_score',     label: 'Brand',      max: 10, color: 'pink'     },
  { key: 'portfolio_score', label: 'Portfolio',  max: 15, color: 'emerald'  },
  { key: 'discipline_score',label: 'Discipline', max: 10, color: 'amber'    },
  { key: 'health_score',    label: 'Health',     max: 10, color: 'teal'     },
] as const

export type ScoreKey = typeof SCORE_CONFIG[number]['key']

export const TOTAL_MAX = SCORE_CONFIG.reduce((sum, s) => sum + s.max, 0) // 100

// ─────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────

export const dailyLogSchema = z.object({
  log_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((d) => d <= new Date().toISOString().slice(0, 10), {
      message: 'Cannot log future dates',
    }),

  // Activity
  deep_work_hours: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Must be 0 or more')
    .max(24, 'Cannot exceed 24 hours'),

  learn2earn_tasks_completed: z.array(z.string().min(1)).default([]),
  frontend_topics: z.array(z.string()).default([]),
  product_design_practice: z.array(z.string()).default([]),

  github_commits: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(0, 'Must be 0 or more'),

  portfolio_project_name: z.string().nullable().default(null),

  portfolio_progress_percent: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(0),

  ai_tools_used: z.array(z.string()).default([]),

  // Reflections
  biggest_learning:  z.string().default(''),
  biggest_challenge: z.string().default(''),
  bug_solved:        z.string().default(''),
  public_documentation_done: z.boolean().default(false),

  // Scores
  coding_score:     z.number().int().min(0).max(25).default(0),
  product_score:    z.number().int().min(0).max(15).default(0),
  docs_score:       z.number().int().min(0).max(15).default(0),
  brand_score:      z.number().int().min(0).max(10).default(0),
  portfolio_score:  z.number().int().min(0).max(15).default(0),
  discipline_score: z.number().int().min(0).max(10).default(0),
  health_score:     z.number().int().min(0).max(10).default(0),
})

export type DailyLogFormValues = z.infer<typeof dailyLogSchema>

// Default values for a blank form
export const defaultDailyLogValues: DailyLogFormValues = {
  log_date: '',
  deep_work_hours: 0,
  learn2earn_tasks_completed: [],
  frontend_topics: [],
  product_design_practice: [],
  github_commits: 0,
  portfolio_project_name: null,
  portfolio_progress_percent: 0,
  ai_tools_used: [],
  biggest_learning: '',
  biggest_challenge: '',
  bug_solved: '',
  public_documentation_done: false,
  coding_score: 0,
  product_score: 0,
  docs_score: 0,
  brand_score: 0,
  portfolio_score: 0,
  discipline_score: 0,
  health_score: 0,
}

// Quick check-in sub-schema
export const quickCheckinSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deep_work_hours: z.number().min(0).max(24),
  github_commits: z.number().int().min(0),
  public_documentation_done: z.boolean(),
  // Quick total (user self-rates, not decomposed)
  quick_total: z.number().int().min(0).max(100),
})

export type QuickCheckinValues = z.infer<typeof quickCheckinSchema>
