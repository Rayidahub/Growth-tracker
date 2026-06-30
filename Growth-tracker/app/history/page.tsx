// app/history/page.tsx
// Paginated history of all daily logs with search, sort, and score filtering.

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import {
  History, ArrowUpRight, TrendingUp, TrendingDown,
  Minus, Clock, GitCommit, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'History — ProductivityOS',
}

const PAGE_SIZE = 20

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
  if (score >= 60) return 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30'
  if (score >= 40) return 'bg-amber-500/20 text-amber-300 ring-amber-500/30'
  return 'bg-red-500/20 text-red-300 ring-red-500/30'
}

function formatDate(dateStr: string): { display: string; dayName: string } {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    display: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string; min?: string; sort?: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const minScore = Number(searchParams.min ?? 0)
  const sort = searchParams.sort === 'asc' ? 'asc' : 'desc'

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [profileResult, logsResult, countResult] = await Promise.all([
    supabase.from('profiles').select('full_name, current_phase, email').eq('id', user.id).single(),
    supabase
      .from('daily_logs')
      .select('id, log_date, total_score, deep_work_hours, github_commits, public_documentation_done, biggest_learning, portfolio_project_name')
      .eq('user_id', user.id)
      .gte('total_score', minScore)
      .order('log_date', { ascending: sort === 'asc' })
      .range(from, to),
    supabase
      .from('daily_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('total_score', minScore),
  ])

  const profile = profileResult.data
  const logs = logsResult.data ?? []
  const totalCount = countResult.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <ToastProvider>
      <AppShell
        userEmail={user.email}
        userName={profile?.full_name}
        currentPhase={profile?.current_phase}
      >
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20">
                <History className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">History</h1>
                <p className="text-xs text-slate-500">{totalCount} total logs</p>
              </div>
            </div>
            <Link
              href="/log"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition-all"
            >
              + New Log
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort toggle */}
            <form>
              <input type="hidden" name="page" value="1" />
              <input type="hidden" name="min" value={minScore} />
              <input type="hidden" name="sort" value={sort === 'desc' ? 'asc' : 'desc'} />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                {sort === 'desc' ? (
                  <><TrendingDown className="h-3.5 w-3.5" /> Newest first</>
                ) : (
                  <><TrendingUp className="h-3.5 w-3.5" /> Oldest first</>
                )}
              </button>
            </form>

            {/* Min score filter */}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Min score:</span>
              {[0, 40, 60, 80].map((s) => (
                <Link
                  key={s}
                  href={`/history?page=1&min=${s}&sort=${sort}`}
                  className={cn(
                    'rounded-lg px-2.5 py-1 transition-all',
                    minScore === s
                      ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {s === 0 ? 'All' : `${s}+`}
                </Link>
              ))}
            </div>
          </div>

          {/* Log list */}
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <p className="text-slate-500 text-sm">No logs found for these filters.</p>
              <Link href="/log" className="mt-3 inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                Create your first log →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
              {logs.map((log, idx) => {
                const prev = logs[idx + 1]
                const delta = prev ? log.total_score - prev.total_score : null
                const { display, dayName } = formatDate(log.log_date)

                return (
                  <Link
                    key={log.id}
                    href={`/log?date=${log.log_date}`}
                    className="group flex items-start gap-4 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors"
                  >
                    {/* Date */}
                    <div className="w-28 flex-shrink-0">
                      <p className="text-sm font-semibold text-white">{display}</p>
                      <p className="text-xs text-slate-600">{dayName}</p>
                    </div>

                    {/* Middle */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {log.portfolio_project_name && (
                        <p className="text-xs font-medium text-indigo-400 truncate">
                          📁 {log.portfolio_project_name}
                        </p>
                      )}
                      {log.biggest_learning && (
                        <p className="text-xs text-slate-500 truncate">
                          💡 {log.biggest_learning}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{log.deep_work_hours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <GitCommit className="h-3 w-3" />{log.github_commits}
                        </span>
                        {log.public_documentation_done && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <FileText className="h-3 w-3" />docs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delta */}
                    {delta !== null && (
                      <div className={cn(
                        'flex items-center gap-0.5 text-xs font-medium flex-shrink-0',
                        delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-600'
                      )}>
                        {delta > 0 ? <TrendingUp className="h-3 w-3" /> :
                         delta < 0 ? <TrendingDown className="h-3 w-3" /> :
                         <Minus className="h-3 w-3" />}
                        {delta > 0 ? `+${delta}` : delta}
                      </div>
                    )}

                    {/* Score badge */}
                    <span className={cn(
                      'flex-shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ring-1 tabular-nums',
                      scoreBadgeClass(log.total_score)
                    )}>
                      {log.total_score}
                    </span>

                    <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors mt-0.5" />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/history?page=${page - 1}&min=${minScore}&sort=${sort}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  ← Previous
                </Link>
              )}
              <span className="text-xs text-slate-500 px-2">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/history?page=${page + 1}&min=${minScore}&sort=${sort}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  Next →
                </Link>
              )}
            </div>
          )}

        </div>
      </AppShell>
    </ToastProvider>
  )
}