'use client'

// components/github/GitHubActivityPanel.tsx
// Shows today's GitHub activity — commits per repo, language bar, PRs.
// Auto-syncs on mount, exposes manual refresh button.

import { useEffect, useState, useCallback } from 'react'
import { Github, RefreshCw, GitCommit, GitPullRequest, AlertCircle, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GitHubActivity, RepoBreakdown, PRDetail } from '@/types/database'

interface GitHubActivityPanelProps {
  userId: string
  isConnected: boolean
  githubUsername: string | null
  lastSynced: string | null
  initialActivity?: GitHubActivity | null
}

// Language → colour map (top 20 languages)
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3572a5',
  Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', Swift: '#f05138', Kotlin: '#a97bff',
  CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051', Vue: '#41b883',
  Svelte: '#ff3e00', Dart: '#00b4ab', PHP: '#4f5d95', Scala: '#c22d40',
  Haskell: '#5e5086',
}

function formatTimeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function LanguageBar({ languages }: { languages: Record<string, number> }) {
  const total = Object.values(languages).reduce((s, v) => s + v, 0)
  if (total === 0) return null

  const sorted = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-400">Languages</p>
      {/* Bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {sorted.map(([lang, bytes]) => (
          <div
            key={lang}
            style={{ width: `${(bytes / total) * 100}%`, background: LANG_COLORS[lang] ?? '#6366f1' }}
            title={`${lang}: ${Math.round((bytes / total) * 100)}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sorted.map(([lang, bytes]) => (
          <div key={lang} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ background: LANG_COLORS[lang] ?? '#6366f1' }}
            />
            <span>{lang}</span>
            <span className="text-slate-600">{Math.round((bytes / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RepoBadge({ repo }: { repo: RepoBreakdown }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/[0.08] transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ background: repo.language ? (LANG_COLORS[repo.language] ?? '#6366f1') : '#334155' }}
        />
        <span className="text-sm font-medium text-white truncate">{repo.repo}</span>
        {repo.language && (
          <span className="text-xs text-slate-500 hidden sm:inline">{repo.language}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <span className="flex items-center gap-1 text-xs font-mono text-indigo-400">
          <GitCommit className="h-3 w-3" />{repo.commits}
        </span>
        <ExternalLink className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </a>
  )
}

function PRChip({ pr }: { pr: PRDetail }) {
  const stateStyle = {
    open:   'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
    merged: 'bg-violet-500/20 text-violet-300 ring-violet-500/30',
    closed: 'bg-slate-500/20 text-slate-300 ring-slate-500/30',
  }[pr.state]

  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/[0.08] transition-colors group"
    >
      <GitPullRequest className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">{pr.title}</p>
        <p className="text-xs text-slate-600">{pr.repo.split('/')[1] ?? pr.repo} #{pr.number}</p>
      </div>
      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 flex-shrink-0', stateStyle)}>
        {pr.state}
      </span>
    </a>
  )
}

export function GitHubActivityPanel({
  userId,
  isConnected,
  githubUsername,
  lastSynced,
  initialActivity,
}: GitHubActivityPanelProps) {
  const [activity, setActivity] = useState<GitHubActivity | null>(initialActivity ?? null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(lastSynced)
  const [autoSyncDone, setAutoSyncDone] = useState(false)

  const sync = useCallback(async (silent = false) => {
    if (!isConnected || isSyncing) return
    if (!silent) setIsSyncing(true)
    setSyncError(null)

    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setSyncError(data.error ?? 'Sync failed')
        return
      }

      if (!data.alreadySynced) {
        // Reload activity from Supabase after sync
        const actRes = await fetch(`/api/github/activity?date=${new Date().toISOString().slice(0, 10)}`)
        if (actRes.ok) {
          const actData = await actRes.json()
          setActivity(actData.activity ?? null)
        }
        setLastSyncTime(new Date().toISOString())
      }
    } catch (err: any) {
      setSyncError(err.message ?? 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [isConnected, isSyncing])

  // Auto-sync on mount
  useEffect(() => {
    if (isConnected && !autoSyncDone) {
      setAutoSyncDone(true)
      sync(true)
    }
  }, [isConnected, autoSyncDone, sync])

  // Not connected state
  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <Github className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">GitHub Activity</p>
            <p className="text-xs text-slate-500">Not connected</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Connect your GitHub account to automatically sync commits, repos, and PRs into your daily logs.
        </p>
        <a
          href={`https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&scope=read:user,repo&redirect_uri=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin + '/api/github/callback') : ''}`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 text-sm font-semibold text-white hover:from-slate-600 hover:to-slate-500 transition-all ring-1 ring-white/10"
        >
          <Github className="h-4 w-4" />
          Connect GitHub
        </a>
      </div>
    )
  }

  const repos = (activity?.repo_breakdown ?? []) as RepoBreakdown[]
  const prs = (activity?.pr_details ?? []) as PRDetail[]
  const langs = (activity?.languages ?? {}) as Record<string, number>

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 ring-1 ring-white/10">
          <Github className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">GitHub Activity</p>
          <p className="text-xs text-slate-500">
            {githubUsername ? `@${githubUsername} · ` : ''}
            {lastSyncTime ? `synced ${formatTimeAgo(lastSyncTime)}` : 'not synced yet'}
          </p>
        </div>
        <button
          onClick={() => sync(false)}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          aria-label="Sync GitHub activity"
        >
          {isSyncing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          {isSyncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* Error */}
      {syncError && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {syncError}
        </div>
      )}

      <div className="px-5 py-4 space-y-5">
        {/* Commit summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Commits', value: activity?.total_commits ?? 0, icon: <GitCommit className="h-3.5 w-3.5" />, color: 'text-indigo-400' },
            { label: 'PRs', value: (activity?.prs_opened ?? 0) + (activity?.prs_merged ?? 0), icon: <GitPullRequest className="h-3.5 w-3.5" />, color: 'text-violet-400' },
            { label: 'Repos', value: repos.length, icon: <Github className="h-3.5 w-3.5" />, color: 'text-slate-400' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className={cn('flex justify-center mb-1', color)}>{icon}</div>
              <div className={cn('text-xl font-black tabular-nums', color)}>{value}</div>
              <div className="text-xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>

        {/* Repos */}
        {repos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">Repositories</p>
            {repos.map((r) => <RepoBadge key={r.full_name} repo={r} />)}
          </div>
        )}

        {/* Languages */}
        {Object.keys(langs).length > 0 && <LanguageBar languages={langs} />}

        {/* PRs */}
        {prs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">Pull Requests</p>
            {prs.slice(0, 5).map((pr) => <PRChip key={`${pr.repo}-${pr.number}`} pr={pr} />)}
          </div>
        )}

        {/* Empty state */}
        {!isSyncing && !activity && !syncError && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-6 w-6 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No GitHub activity found for today yet.</p>
            <p className="text-xs text-slate-600 mt-1">Push some commits and sync again.</p>
          </div>
        )}

        {isSyncing && !activity && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching GitHub activity…
          </div>
        )}
      </div>
    </div>
  )
}