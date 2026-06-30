// lib/recap/types.ts
// All types for the AI weekly recap system.

import type { DailyLog } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Structured recap sections returned by Claude
// ─────────────────────────────────────────────────────────────

export interface RecapWin {
  title: string       // short headline e.g. "Strongest coding week yet"
  detail: string      // 1-2 sentence explanation
}

export interface RecapGap {
  area: string        // pillar or habit e.g. "Health score", "Documentation"
  observation: string // what Claude noticed
  suggestion: string  // actionable fix
}

export interface RecapActionItem {
  priority: 'high' | 'medium' | 'low'
  action: string      // concrete thing to do next week
  pillar: string      // which score pillar this affects
}

export interface PillarComparison {
  key: string
  label: string
  thisWeek: number
  lastWeek: number
  change: number
  trend: 'up' | 'down' | 'flat'
  max: number
}

export interface RecapData {
  intro: string                      // 2-3 sentence coaching paragraph
  wins: RecapWin[]                   // 2-4 wins
  gaps: RecapGap[]                   // 1-3 gaps
  actionItems: RecapActionItem[]     // 3-5 prioritised next steps
  pillarComparisons: PillarComparison[]
  weekSummary: {
    thisWeekAvg: number
    lastWeekAvg: number
    totalHours: number
    totalCommits: number
    logCount: number
    topAiTool: string | null
    mostActiveDay: string | null
  }
  coachingTone: string               // one word: "encouraging" | "challenging" | "balanced"
  nextWeekFocus: string              // single sentence goal for next week
}

// Full DB row
export interface WeeklyRecap {
  id: string
  user_id: string
  week_start: string
  week_end: string
  logs_snapshot: DailyLog[]
  prev_logs_snapshot: DailyLog[]
  recap_data: RecapData
  recap_text: string
  model_used: string
  tokens_used: number
  generated_at: string
  created_at: string
}

// ─────────────────────────────────────────────────────────────
// Week calculation helpers
// ─────────────────────────────────────────────────────────────

/** Returns the Monday of the current week as "YYYY-MM-DD" */
export function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day   // Mon=0 offset
  d.setDate(d.getDate() + diff)
  return toISO(d)
}

/** Returns the Sunday of the current week as "YYYY-MM-DD" */
export function getCurrentWeekEnd(): string {
  const start = new Date(getCurrentWeekStart() + 'T00:00:00')
  start.setDate(start.getDate() + 6)
  return toISO(start)
}

/** Previous week Monday */
export function getPrevWeekStart(): string {
  const start = new Date(getCurrentWeekStart() + 'T00:00:00')
  start.setDate(start.getDate() - 7)
  return toISO(start)
}

/** Previous week Sunday */
export function getPrevWeekEnd(): string {
  const start = new Date(getCurrentWeekStart() + 'T00:00:00')
  start.setDate(start.getDate() - 1)
  return toISO(start)
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}
