// lib/supabase/dailyLogs.ts
// All CRUD operations for the daily_logs table.
// These functions are designed to run in Client Components (browser context).

import { createClient } from '@/lib/supabase/client'
import type { DailyLog, DailyLogInsert, DailyLogUpdate } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DailyLogResult {
  data: DailyLog | null
  error: string | null
}

export interface DailyLogsListResult {
  data: DailyLog[]
  error: string | null
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Returns today's date as "YYYY-MM-DD" in local time */
export function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Formats any Date → "YYYY-MM-DD" */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────
// READ — get a single log by date
// ─────────────────────────────────────────────────────────────

export async function getDailyLog(
  userId: string,
  logDate: string
): Promise<DailyLogResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle()

  if (error) {
    console.error('[getDailyLog]', error.message)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────
// READ — list logs for a user (most recent first)
// ─────────────────────────────────────────────────────────────

export async function listDailyLogs(
  userId: string,
  limit = 30
): Promise<DailyLogsListResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listDailyLogs]', error.message)
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

// ─────────────────────────────────────────────────────────────
// CREATE — insert a new log
// ─────────────────────────────────────────────────────────────

export async function createDailyLog(
  payload: DailyLogInsert
): Promise<DailyLogResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('[createDailyLog]', error.message)
    // Duplicate date error
    if (error.code === '23505') {
      return {
        data: null,
        error: 'A log for this date already exists. Use update instead.',
      }
    }
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────
// UPDATE — update an existing log by its ID
// ─────────────────────────────────────────────────────────────

export async function updateDailyLog(
  logId: string,
  payload: DailyLogUpdate
): Promise<DailyLogResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .update(payload)
    .eq('id', logId)
    .select()
    .single()

  if (error) {
    console.error('[updateDailyLog]', error.message)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────
// UPSERT — create or update based on (user_id, log_date)
// This is the main entry point for form submission.
// ─────────────────────────────────────────────────────────────

export async function upsertDailyLog(
  payload: DailyLogInsert
): Promise<DailyLogResult> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(payload, {
      onConflict: 'user_id,log_date',
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[upsertDailyLog]', error.message)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

// ─────────────────────────────────────────────────────────────
// DELETE — remove a log by ID
// ─────────────────────────────────────────────────────────────

export async function deleteDailyLog(logId: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .eq('id', logId)

  if (error) {
    console.error('[deleteDailyLog]', error.message)
    return { error: error.message }
  }

  return { error: null }
}

// ─────────────────────────────────────────────────────────────
// DRAFT — localStorage helpers (no DB)
// ─────────────────────────────────────────────────────────────

const DRAFT_KEY_PREFIX = 'productivity_draft_'

export function saveDraft(userId: string, logDate: string, values: object): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      `${DRAFT_KEY_PREFIX}${userId}_${logDate}`,
      JSON.stringify({ ...values, savedAt: new Date().toISOString() })
    )
  } catch {
    console.warn('[saveDraft] localStorage write failed')
  }
}

export function loadDraft(userId: string, logDate: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${userId}_${logDate}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearDraft(userId: string, logDate: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${userId}_${logDate}`)
  } catch {
    // silently ignore
  }
}
