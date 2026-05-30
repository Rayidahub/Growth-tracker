// lib/analytics/computeStats.ts
// Pure functions that derive all analytics from an array of DailyLog rows.
// No Supabase dependency — pass the data in, get stats back. Fully testable.

import type { DailyLog } from '@/types/database'
import { SCORE_CONFIG, TOTAL_MAX } from '@/lib/validations/dailyLog'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface WeeklyBucket {
  weekLabel: string      // e.g. "Dec 30"
  weekStart: string      // ISO date of Monday
  avgScore: number
  totalHours: number
  totalCommits: number
  logCount: number
}

export interface ScorePillarStat {
  key: string
  label: string
  max: number
  color: string
  avg: number
  best: number
  latest: number
  trend: 'up' | 'down' | 'flat'
  pct: number            // avg / max * 100
}

export interface DailyPoint {
  date: string           // "YYYY-MM-DD"
  displayDate: string    // "Jan 5"
  totalScore: number
  deepWorkHours: number
  commits: number
}

export interface OverallStats {
  totalLogs: number
  avgScore: number
  bestScore: number
  bestScoreDate: string
  currentStreak: number
  longestStreak: number
  totalDeepWorkHours: number
  totalCommits: number
  avgDeepWorkPerDay: number
  completionRate: number   // logs / days since start
  scoreVelocity: number    // avg score change per week (last 4 weeks vs previous 4)
}

export interface PhaseProgress {
  currentPhase: string
  startDate: string
  daysInPhase: number
  avgScoreThisPhase: number
  scoreGoal: number
  progressToGoal: number    // 0-100
  readyToAdvance: boolean
}

// ─────────────────────────────────────────────────────────────
// Helper — parse "YYYY-MM-DD" → Date in local time
// ─────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatShortDate(s: string): string {
  const d = parseDate(s)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────
// computeOverallStats
// ─────────────────────────────────────────────────────────────

export function computeOverallStats(
  logs: DailyLog[],
  startDate: string
): OverallStats {
  if (logs.length === 0) {
    return {
      totalLogs: 0, avgScore: 0, bestScore: 0, bestScoreDate: '',
      currentStreak: 0, longestStreak: 0, totalDeepWorkHours: 0,
      totalCommits: 0, avgDeepWorkPerDay: 0, completionRate: 0, scoreVelocity: 0,
    }
  }

  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date))

  const totalScore = sorted.reduce((s, l) => s + l.total_score, 0)
  const avgScore = Math.round(totalScore / sorted.length)

  const best = sorted.reduce((b, l) => l.total_score > b.total_score ? l : b, sorted[0])

  const totalDeepWorkHours = sorted.reduce((s, l) => s + l.deep_work_hours, 0)
  const totalCommits = sorted.reduce((s, l) => s + l.github_commits, 0)

  // Streaks
  const today = toISODate(new Date())
  const dateSet = new Set(sorted.map((l) => l.log_date))

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let checkDate = new Date()

  // Current streak — walk backwards from today
  for (let i = 0; i < 365; i++) {
    const d = toISODate(checkDate)
    if (dateSet.has(d)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (d === today) {
      // today not logged yet — don't break streak
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Longest streak
  const allDates = Array.from(dateSet).sort()
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = parseDate(allDates[i - 1])
      const curr = parseDate(allDates[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1
    }
    longestStreak = Math.max(longestStreak, tempStreak)
  }

  // Completion rate
  const start = parseDate(startDate)
  const daysElapsed = Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000))
  const completionRate = Math.round((sorted.length / daysElapsed) * 100)

  // Score velocity — last 4 weeks vs previous 4 weeks
  const recentLogs = sorted.slice(-28)
  const midpoint = Math.floor(recentLogs.length / 2)
  const firstHalf = recentLogs.slice(0, midpoint)
  const secondHalf = recentLogs.slice(midpoint)
  const avgFirst = firstHalf.length
    ? firstHalf.reduce((s, l) => s + l.total_score, 0) / firstHalf.length
    : 0
  const avgSecond = secondHalf.length
    ? secondHalf.reduce((s, l) => s + l.total_score, 0) / secondHalf.length
    : 0
  const scoreVelocity = Math.round(avgSecond - avgFirst)

  return {
    totalLogs: sorted.length,
    avgScore,
    bestScore: best.total_score,
    bestScoreDate: best.log_date,
    currentStreak,
    longestStreak,
    totalDeepWorkHours: Math.round(totalDeepWorkHours * 10) / 10,
    totalCommits,
    avgDeepWorkPerDay: Math.round((totalDeepWorkHours / sorted.length) * 10) / 10,
    completionRate: Math.min(100, completionRate),
    scoreVelocity,
  }
}

// ─────────────────────────────────────────────────────────────
// computeDailyPoints — last N days as chart-ready array
// ─────────────────────────────────────────────────────────────

export function computeDailyPoints(logs: DailyLog[], days = 30): DailyPoint[] {
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const recent = sorted.slice(-days)

  return recent.map((l) => ({
    date: l.log_date,
    displayDate: formatShortDate(l.log_date),
    totalScore: l.total_score,
    deepWorkHours: l.deep_work_hours,
    commits: l.github_commits,
  }))
}

// ─────────────────────────────────────────────────────────────
// computeWeeklyBuckets — group logs into ISO weeks
// ─────────────────────────────────────────────────────────────

export function computeWeeklyBuckets(logs: DailyLog[], weeks = 12): WeeklyBucket[] {
  const bucketMap = new Map<string, DailyLog[]>()

  for (const log of logs) {
    const monday = getMondayOfWeek(parseDate(log.log_date))
    const key = toISODate(monday)
    if (!bucketMap.has(key)) bucketMap.set(key, [])
    bucketMap.get(key)!.push(log)
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort().slice(-weeks)

  return sortedKeys.map((key) => {
    const entries = bucketMap.get(key)!
    const avgScore = Math.round(entries.reduce((s, l) => s + l.total_score, 0) / entries.length)
    const totalHours = Math.round(entries.reduce((s, l) => s + l.deep_work_hours, 0) * 10) / 10
    const totalCommits = entries.reduce((s, l) => s + l.github_commits, 0)
    const d = parseDate(key)
    const weekLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return { weekLabel, weekStart: key, avgScore, totalHours, totalCommits, logCount: entries.length }
  })
}

// ─────────────────────────────────────────────────────────────
// computePillarStats — per-pillar averages, bests, trends
// ─────────────────────────────────────────────────────────────

export function computePillarStats(logs: DailyLog[]): ScorePillarStat[] {
  if (logs.length === 0) {
    return SCORE_CONFIG.map(({ key, label, max, color }) => ({
      key, label, max, color,
      avg: 0, best: 0, latest: 0, trend: 'flat' as const, pct: 0,
    }))
  }

  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const recent7 = sorted.slice(-7)
  const prev7 = sorted.slice(-14, -7)

  return SCORE_CONFIG.map(({ key, label, max, color }) => {
    const k = key as keyof DailyLog
    const values = sorted.map((l) => (l[k] as number) ?? 0)
    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
    const best = Math.max(...values)
    const latest = values[values.length - 1] ?? 0

    const recent7Avg = recent7.length
      ? recent7.reduce((s, l) => s + ((l[k] as number) ?? 0), 0) / recent7.length
      : avg
    const prev7Avg = prev7.length
      ? prev7.reduce((s, l) => s + ((l[k] as number) ?? 0), 0) / prev7.length
      : avg

    const diff = recent7Avg - prev7Avg
    const trend: 'up' | 'down' | 'flat' =
      diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat'

    return {
      key, label, max, color,
      avg, best, latest, trend,
      pct: Math.round((avg / max) * 100),
    }
  })
}

// ─────────────────────────────────────────────────────────────
// computePhaseProgress
// ─────────────────────────────────────────────────────────────

const PHASE_GOALS: Record<string, number> = {
  'Phase 1': 60,
  'Phase 2': 70,
  'Phase 3': 80,
  'Phase 4': 90,
}

export function computePhaseProgress(
  logs: DailyLog[],
  currentPhase: string,
  startDate: string
): PhaseProgress {
  const scoreGoal = PHASE_GOALS[currentPhase] ?? 75
  const recentLogs = logs.slice(-14)
  const avgScoreThisPhase = recentLogs.length
    ? Math.round(recentLogs.reduce((s, l) => s + l.total_score, 0) / recentLogs.length)
    : 0

  const start = parseDate(startDate)
  const daysInPhase = Math.floor((Date.now() - start.getTime()) / 86400000)
  const progressToGoal = Math.min(100, Math.round((avgScoreThisPhase / scoreGoal) * 100))
  const readyToAdvance = avgScoreThisPhase >= scoreGoal && recentLogs.length >= 7

  return {
    currentPhase,
    startDate,
    daysInPhase,
    avgScoreThisPhase,
    scoreGoal,
    progressToGoal,
    readyToAdvance,
  }
}

// ─────────────────────────────────────────────────────────────
// computeHeatmapData — for the full calendar heatmap (52 weeks)
// ─────────────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string
  score: number | null
  displayDate: string
  dayOfWeek: number   // 0=Sun, 6=Sat
}

export function computeHeatmapData(logs: DailyLog[]): HeatmapDay[] {
  const logMap = new Map(logs.map((l) => [l.log_date, l.total_score]))
  const days: HeatmapDay[] = []

  // Start from 364 days ago
  for (let i = 363; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const dateStr = toISODate(d)
    days.push({
      date: dateStr,
      score: logMap.get(dateStr) ?? null,
      displayDate: formatShortDate(dateStr),
      dayOfWeek: d.getDay(),
    })
  }

  return days
}