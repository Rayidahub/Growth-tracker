// lib/recap/service.ts
// Supabase CRUD for the weekly_recaps table.
// Generation logic lives in the API route — this is pure storage.

import { createClient } from '@/lib/supabase/client'
import type { WeeklyRecap } from '@/lib/recap/types'
import { getCurrentWeekStart } from '@/lib/recap/types'

export async function getRecapForWeek(
  userId: string,
  weekStart: string
): Promise<{ data: WeeklyRecap | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: data as WeeklyRecap | null, error: null }
}

export async function listRecaps(
  userId: string,
  limit = 12
): Promise<{ data: WeeklyRecap[]; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('id, user_id, week_start, week_end, recap_data, generated_at, tokens_used')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit)

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as WeeklyRecap[], error: null }
}

export async function deleteRecap(
  recapId: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('weekly_recaps')
    .delete()
    .eq('id', recapId)

  return { error: error?.message ?? null }
}
