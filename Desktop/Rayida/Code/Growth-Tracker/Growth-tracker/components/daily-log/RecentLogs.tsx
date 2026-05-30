// components/daily-log/RecentLogs.tsx
// Shows the last N log entries in a compact table with links to edit.

import Link from 'next/link'
import { ArrowUpRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DailyLog } from '@/types/database'

interface RecentLogsProps {
  logs: Pick<DailyLog, 'id' | 'log_date' | 'total_score' | 'deep_work_hours' | 'github_commits'>[]
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
  if (score >= 60) return 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30'
  if (score >= 40) return 'bg-amber-500/20 text-amber-300 ring-amber-500/30'
  return 'bg-red-500/20 text-red-300 ring-red-500/30'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function RecentLogs({ logs }: RecentLogsProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
        <p className="text-sm text-slate-500">No logs yet. Start with a quick check-in above!</p>
        <Link
          href="/log"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Create your first log <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <p className="text-sm font-semibold text-white">Recent Logs</p>
        <Link
          href="/log"
          className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          New log <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-white/5">
        {logs.map((log, idx) => {
          const prev = logs[idx + 1]
          const delta = prev ? log.total_score - prev.total_score : null

          return (
            <Link
              key={log.id}
              href={`/log?date=${log.log_date}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors group"
            >
              {/* Date */}
              <div className="min-w-[110px]">
                <p className="text-sm font-medium text-white">{formatDate(log.log_date)}</p>
                <p className="text-xs text-slate-600">{log.log_date}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-1 text-xs text-slate-500">
                <span>{log.deep_work_hours}h focus</span>
                <span>{log.github_commits} commits</span>
              </div>

              {/* Delta */}
              {delta !== null && (
                <div className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-500'
                )}>
                  {delta > 0 ? <TrendingUp className="h-3 w-3" /> :
                   delta < 0 ? <TrendingDown className="h-3 w-3" /> :
                   <Minus className="h-3 w-3" />}
                  {delta > 0 ? `+${delta}` : delta}
                </div>
              )}

              {/* Score badge */}
              <span className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 tabular-nums',
                scoreBadgeClass(log.total_score)
              )}>
                {log.total_score}
              </span>

              <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
