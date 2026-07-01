// lib/github/service.ts
// Supabase-side operations for the GitHub integration.
// Stores/retrieves tokens, upserts activity snapshots, syncs to daily_logs.

import { createClient } from '@/lib/supabase/client'
import { fetchDailyActivity } from '@/lib/github/api'
import type { GitHubActivity, GitHubActivityInsert } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────────────────────

/** Store or replace a GitHub access token for a user */
export async function saveGitHubToken(
  userId: string,
  accessToken: string,
  scope: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('github_tokens')
    .upsert(
      { user_id: userId, access_token: accessToken, scope },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return { error: null }
}

/** Get the stored GitHub access token for a user */
export async function getGitHubToken(
  userId: string
): Promise<{ token: string | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('github_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { token: null, error: error.message }
  return { token: data?.access_token ?? null, error: null }
}

/** Delete a user's GitHub token (disconnect) */
export async function deleteGitHubToken(
  userId: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('github_tokens')
    .delete()
    .eq('user_id', userId)

  if (error) return { error: error.message }

  // Also clear connected flags on profile
  await supabase
    .from('profiles')
    .update({ github_connected: false, github_last_synced: null })
    .eq('id', userId)

  return { error: null }
}

// ─────────────────────────────────────────────────────────────
// Activity storage
// ─────────────────────────────────────────────────────────────

export async function getGitHubActivity(
  userId: string,
  activityDate: string
): Promise<{ data: GitHubActivity | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('github_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', activityDate)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function listGitHubActivity(
  userId: string,
  days = 30
): Promise<{ data: GitHubActivity[]; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('github_activity')
    .select('*')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(days)

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

// ─────────────────────────────────────────────────────────────
// Main sync function — fetch from GitHub API and persist
// ─────────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean
  totalCommits: number
  repoCount: number
  prsTotal: number
  error: string | null
  alreadySynced: boolean
}

export async function syncGitHubActivity(
  userId: string,
  targetDate?: string
): Promise<SyncResult> {
  const supabase = createClient()
  const today = targetDate ?? new Date().toISOString().slice(0, 10)

  // 1. Get stored token
  const { token, error: tokenError } = await getGitHubToken(userId)
  if (!token) {
    return { success: false, totalCommits: 0, repoCount: 0, prsTotal: 0, error: tokenError ?? 'GitHub not connected', alreadySynced: false }
  }

  // 2. Get github username from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('github_username, github_last_synced')
    .eq('id', userId)
    .single()

  if (!profile?.github_username) {
    return { success: false, totalCommits: 0, repoCount: 0, prsTotal: 0, error: 'No GitHub username set in profile', alreadySynced: false }
  }

  // 3. Check if already synced recently (within last 15 min for today)
  if (today === new Date().toISOString().slice(0, 10) && profile.github_last_synced) {
    const lastSync = new Date(profile.github_last_synced)
    const minsAgo = (Date.now() - lastSync.getTime()) / 60000
    if (minsAgo < 15) {
      // Return cached data
      const { data: cached } = await supabase
        .from('github_activity')
        .select('total_commits, repo_breakdown, prs_opened, prs_merged, prs_reviewed')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .maybeSingle()

      return {
        success: true,
        totalCommits: cached?.total_commits ?? 0,
        repoCount: cached?.repo_breakdown?.length ?? 0,
        prsTotal: ((cached?.prs_opened ?? 0) + (cached?.prs_merged ?? 0)),
        error: null,
        alreadySynced: true,
      }
    }
  }

  // 4. Fetch from GitHub
  let summary
  try {
    summary = await fetchDailyActivity(token, profile.github_username, today)
  } catch (err: unknown) {
    return { success: false, totalCommits: 0, repoCount: 0, prsTotal: 0, error: (err as Error).message, alreadySynced: false }
  }

  // 5. Upsert github_activity row
  const activityPayload: GitHubActivityInsert = {
    user_id: userId,
    activity_date: today,
    total_commits: summary.totalCommits,
    repos_committed: summary.reposCommitted,
    repo_breakdown: summary.repoBreakdown as unknown,
    languages: summary.languages as unknown,
    prs_opened: summary.prsOpened,
    prs_merged: summary.prsMerged,
    prs_reviewed: summary.prsReviewed,
    pr_details: summary.prDetails as unknown,
    issues_opened: summary.issuesOpened,
    issues_closed: summary.issuesClosed,
    commit_messages: summary.commitMessages,
    stars_received: summary.starsReceived,
    synced_at: new Date().toISOString(),
  }

  const { error: upsertError } = await supabase
    .from('github_activity')
    .upsert(activityPayload, { onConflict: 'user_id,activity_date' })

  if (upsertError) {
    return { success: false, totalCommits: 0, repoCount: 0, prsTotal: 0, error: upsertError.message, alreadySynced: false }
  }

  // 6. Auto-update github_commits on matching daily_log
  if (summary.totalCommits > 0) {
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id, github_commits')
      .eq('user_id', userId)
      .eq('log_date', today)
      .maybeSingle()

    if (existingLog) {
      // Only overwrite if GitHub count is higher (protects manual entries)
      if (summary.totalCommits > existingLog.github_commits) {
        await supabase
          .from('daily_logs')
          .update({ github_commits: summary.totalCommits })
          .eq('id', existingLog.id)
      }
    }
  }

  // 7. Update profile last synced + github_user_id
  await supabase
    .from('profiles')
    .update({
      github_connected: true,
      github_last_synced: new Date().toISOString(),
      github_user_id: summary.user.id,
    })
    .eq('id', userId)

  return {
    success: true,
    totalCommits: summary.totalCommits,
    repoCount: summary.repoBreakdown.length,
    prsTotal: summary.prsOpened + summary.prsMerged,
    error: null,
    alreadySynced: false,
  }
}