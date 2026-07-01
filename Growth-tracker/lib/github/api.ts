// lib/github/api.ts
// All GitHub REST API calls. Accepts an access token, returns typed data.
// Never imports Supabase — pure fetch wrapper. Fully testable in isolation.

import type { RepoBreakdown, PRDetail } from '@/types/database'

const GH_API = 'https://api.github.com'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
  public_repos: number
  followers: number
  following: number
}

export interface GitHubCommit {
  sha: string
  message: string
  repo: string
  repo_full_name: string
  url: string
  additions: number
  deletions: number
  date: string
}

export interface DailyGitHubSummary {
  user: GitHubUser
  totalCommits: number
  repoBreakdown: RepoBreakdown[]
  languages: Record<string, number>
  commitMessages: string[]
  reposCommitted: string[]
  prsOpened: number
  prsMerged: number
  prsReviewed: number
  prDetails: PRDetail[]
  issuesOpened: number
  issuesClosed: number
  starsReceived: number
}

// ─────────────────────────────────────────────────────────────
// Base fetch with auth header
// ─────────────────────────────────────────────────────────────

async function ghFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : `${GH_API}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options?.headers,
    },
    next: { revalidate: 0 }, // always fresh
  })

  if (res.status === 401) throw new Error('GitHub token expired or invalid')
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining === '0') {
      const reset = res.headers.get('x-ratelimit-reset')
      const resetDate = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'soon'
      throw new Error(`GitHub rate limit exceeded. Resets at ${resetDate}`)
    }
    throw new Error('GitHub API forbidden')
  }
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${path}`)

  return res.json() as Promise<T>
}

// ─────────────────────────────────────────────────────────────
// Paginate through all results
// ─────────────────────────────────────────────────────────────

async function ghFetchAll<T>(
  path: string,
  token: string,
  maxPages = 5
): Promise<T[]> {
  const results: T[] = []
  let page = 1

  while (page <= maxPages) {
    const sep = path.includes('?') ? '&' : '?'
    const items = await ghFetch<T[]>(`${path}${sep}per_page=100&page=${page}`, token)
    if (!Array.isArray(items) || items.length === 0) break
    results.push(...items)
    if (items.length < 100) break
    page++
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// Get authenticated user
// ─────────────────────────────────────────────────────────────

export async function getGitHubUser(token: string): Promise<GitHubUser> {
  return ghFetch<GitHubUser>('/user', token)
}

// ─────────────────────────────────────────────────────────────
// Get all events for today (commits come via push events)
// ─────────────────────────────────────────────────────────────

interface GHPushEvent {
  type: string
  repo: { name: string; url: string }
  payload: {
    commits?: Array<{ sha: string; message: string; url: string }>
    size?: number
  }
  created_at: string
}

interface GHIssueEvent {
  type: string
  payload: { action: string }
  created_at: string
}

interface GHPREvent {
  type: string
  payload: {
    action: string
    pull_request?: { title: string; number: number; merged: boolean; html_url: string; merged_at: string | null; created_at: string }
  }
  repo: { name: string }
  created_at: string
}

// ─────────────────────────────────────────────────────────────
// Fetch languages for a single repo
// ─────────────────────────────────────────────────────────────

export async function getRepoLanguages(
  fullName: string,
  token: string
): Promise<Record<string, number>> {
  try {
    return await ghFetch<Record<string, number>>(`/repos/${fullName}/languages`, token)
  } catch {
    return {}
  }
}

// ─────────────────────────────────────────────────────────────
// fetchDailyActivity — the main entry point
// Gets everything for a given date (defaults to today)
// ─────────────────────────────────────────────────────────────

export async function fetchDailyActivity(
  token: string,
  username: string,
  targetDate?: string
): Promise<DailyGitHubSummary> {
  const date = targetDate ?? new Date().toISOString().slice(0, 10)
  const user = await getGitHubUser(token)

  // Fetch user events (up to 300, last 3 pages)
  let events: unknown[] = []
  try {
    events = await ghFetchAll<unknown>(`/users/${username}/events`, token, 3)
  } catch {
    events = []
  }

  // Filter to target date
  const todayEvents = events.filter((e: unknown) => {
    const d = (e as { created_at?: string }).created_at?.slice(0, 10)
    return d === date
  })

  // ── Commits from PushEvents ──────────────────────────────
  const pushEvents = todayEvents.filter((e: unknown) => (e as { type: string }).type === 'PushEvent') as GHPushEvent[]

  const repoCommitMap = new Map<string, {
    commits: number; messages: string[]; url: string; additions: number; deletions: number
  }>()

  for (const evt of pushEvents) {
    const repoName = evt.repo.name
    const commitCount = evt.payload.commits?.length ?? evt.payload.size ?? 0
    const messages = (evt.payload.commits ?? []).map((c) => c.message.split('\n')[0])

    if (!repoCommitMap.has(repoName)) {
      repoCommitMap.set(repoName, { commits: 0, messages: [], url: `https://github.com/${repoName}`, additions: 0, deletions: 0 })
    }
    const entry = repoCommitMap.get(repoName)!
    entry.commits += commitCount
    entry.messages.push(...messages)
  }

  const totalCommits = Array.from(repoCommitMap.values()).reduce((s, r) => s + r.commits, 0)
  const commitMessages = Array.from(repoCommitMap.values()).flatMap((r) => r.messages).slice(0, 20)
  const reposCommitted = Array.from(repoCommitMap.keys())

  // ── Fetch languages per repo (parallel, max 5) ──────────
  const languageTotals: Record<string, number> = {}
  const repoBreakdown: RepoBreakdown[] = []

  const reposToFetch = reposCommitted.slice(0, 5)
  const langResults = await Promise.allSettled(
    reposToFetch.map((r) => getRepoLanguages(r, token))
  )

  reposToFetch.forEach((repoFullName, idx) => {
    const entry = repoCommitMap.get(repoFullName)!
    const langs = langResults[idx].status === 'fulfilled' ? langResults[idx].value : {}
    const topLang = Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // Accumulate languages
    for (const [lang, bytes] of Object.entries(langs)) {
      languageTotals[lang] = (languageTotals[lang] ?? 0) + bytes
    }

    const shortName = repoFullName.split('/')[1] ?? repoFullName
    repoBreakdown.push({
      repo: shortName,
      full_name: repoFullName,
      commits: entry.commits,
      language: topLang,
      url: entry.url,
      additions: entry.additions,
      deletions: entry.deletions,
    })
  })

  // Add remaining repos without language data
  for (const repoFullName of reposCommitted.slice(5)) {
    const entry = repoCommitMap.get(repoFullName)!
    const shortName = repoFullName.split('/')[1] ?? repoFullName
    repoBreakdown.push({
      repo: shortName, full_name: repoFullName,
      commits: entry.commits, language: null,
      url: entry.url, additions: 0, deletions: 0,
    })
  }

  // Sort breakdown by commits desc
  repoBreakdown.sort((a, b) => b.commits - a.commits)

  // ── PR events ────────────────────────────────────────────
  const prEvents = todayEvents.filter((e: unknown) =>
    (e as { type: string }).type === 'PullRequestEvent'
  ) as GHPREvent[]

  let prsOpened = 0
  let prsMerged = 0
  let prsReviewed = 0
  const prDetails: PRDetail[] = []

  for (const evt of prEvents) {
    const pr = evt.payload.pull_request
    if (!pr) continue

    if (evt.payload.action === 'opened') {
      prsOpened++
      prDetails.push({
        number: pr.number, title: pr.title, repo: evt.repo.name,
        state: 'open', url: pr.html_url,
        created_at: pr.created_at, merged_at: null,
      })
    } else if (evt.payload.action === 'closed' && pr.merged) {
      prsMerged++
      prDetails.push({
        number: pr.number, title: pr.title, repo: evt.repo.name,
        state: 'merged', url: pr.html_url,
        created_at: pr.created_at, merged_at: pr.merged_at,
      })
    }
  }

  // PR reviews
  const reviewEvents = todayEvents.filter((e: unknown) => (e as { type: string }).type === 'PullRequestReviewEvent')
  prsReviewed = reviewEvents.length

  // ── Issue events ─────────────────────────────────────────
  const issueEvents = todayEvents.filter((e: unknown) => (e as { type: string }).type === 'IssuesEvent') as GHIssueEvent[]
  const issuesOpened = issueEvents.filter((e) => e.payload.action === 'opened').length
  const issuesClosed = issueEvents.filter((e) => e.payload.action === 'closed').length

  // ── Stars received ───────────────────────────────────────
  const watchEvents = todayEvents.filter((e: unknown) => (e as { type: string }).type === 'WatchEvent')
  const starsReceived = watchEvents.length

  return {
    user,
    totalCommits,
    repoBreakdown,
    languages: languageTotals,
    commitMessages,
    reposCommitted,
    prsOpened,
    prsMerged,
    prsReviewed,
    prDetails,
    issuesOpened,
    issuesClosed,
    starsReceived,
  }
}