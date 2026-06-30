// components/daily-log/LogStreak.tsx
// Shows a compact 7-day streak calendar strip on the dashboard.

import { cn } from '@/lib/utils'
import type { DailyLog } from '@/types/database'

interface LogStreakProps {
  logs: Pick<DailyLog, 'log_date' | 'total_score'>[]
}

function getLastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    )
  }
  return days
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function scoreToColor(score: number | undefined): string {
  if (score === undefined) return 'bg-white/5 border-white/10'
  if (score >= 80) return 'bg-emerald-500/40 border-emerald-500/50'
  if (score >= 60) return 'bg-indigo-500/40 border-indigo-500/50'
  if (score >= 40) return 'bg-amber-500/40 border-amber-500/50'
  return 'bg-red-500/30 border-red-500/40'
}

export function LogStreak({ logs }: LogStreakProps) {
  const days = getLastNDays(14)
  const logMap = new Map(logs.map((l) => [l.log_date, l.total_score]))

  // Calculate current streak
  let streak = 0
  const today = days[days.length - 1]
  for (let i = days.length - 1; i >= 0; i--) {
    if (logMap.has(days[i])) {
      streak++
    } else {
      if (days[i] !== today) break // today not logged yet — don't break streak
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">14-Day Activity</p>
          <p className="text-xs text-slate-500">Each block = one daily log</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-indigo-400 tabular-nums">{streak}</div>
          <div className="text-xs text-slate-500">day streak</div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {/* Day labels */}
        {days.slice(7).map((d) => {
          const dayIdx = new Date(d + 'T00:00:00').getDay()
          return (
            <div key={`label-${d}`} className="text-center text-[10px] text-slate-600 pb-1">
              {DAY_LABELS[dayIdx]}
            </div>
          )
        })}
        {/* Last 7 days blocks */}
        {days.slice(7).map((d) => {
          const score = logMap.get(d)
          const isToday = d === today
          return (
            <div
              key={d}
              title={score !== undefined ? `${d}: ${score}/100` : `${d}: No log`}
              className={cn(
                'h-8 rounded-lg border transition-all cursor-default',
                scoreToColor(score),
                isToday && 'ring-1 ring-indigo-400/60'
              )}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {[
          { label: '80+', color: 'bg-emerald-500/40' },
          { label: '60–79', color: 'bg-indigo-500/40' },
          { label: '40–59', color: 'bg-amber-500/40' },
          { label: '<40', color: 'bg-red-500/30' },
          { label: 'No log', color: 'bg-white/5' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded-sm border border-white/10', color)} />
            <span className="text-[10px] text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
