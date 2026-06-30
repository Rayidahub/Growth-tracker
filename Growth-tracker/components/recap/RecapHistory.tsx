'use client'

// components/recap/RecapHistory.tsx
// Compact list of past recaps — click to load one into the display.

import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'
import type { WeeklyRecap } from '@/lib/recap/types'
import { formatWeekRange } from '@/lib/recap/types'
import { cn } from '@/lib/utils'

interface RecapHistoryProps {
  recaps: Pick<WeeklyRecap, 'id' | 'week_start' | 'week_end' | 'recap_data' | 'generated_at'>[]
  activeId: string | null
  onSelect: (recap: Pick<WeeklyRecap, 'id' | 'week_start' | 'week_end' | 'recap_data' | 'generated_at'>) => void
}

export function RecapHistory({ recaps, activeId, onSelect }: RecapHistoryProps) {
  if (recaps.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-semibold text-white">Past Recaps</p>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">{recaps.length}</span>
      </div>
      <div className="divide-y divide-white/5">
        {recaps.map((r) => {
          const avg    = r.recap_data?.weekSummary?.thisWeekAvg ?? 0
          const prev   = r.recap_data?.weekSummary?.lastWeekAvg ?? 0
          const change = avg - prev
          const isActive = r.id === activeId

          return (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className={cn(
                'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors',
                isActive ? 'bg-indigo-500/15' : 'hover:bg-white/5'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {formatWeekRange(r.week_start, r.week_end)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(r.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {change !== 0 && (
                  <span className={cn(
                    'text-xs',
                    change > 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {change > 0
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : <TrendingDown className="h-3.5 w-3.5" />}
                  </span>
                )}
                {change === 0 && <Minus className="h-3.5 w-3.5 text-slate-600" />}
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  avg >= 80 ? 'text-emerald-400' :
                  avg >= 60 ? 'text-indigo-400' :
                  avg >= 40 ? 'text-amber-400' : 'text-red-400'
                )}>
                  {avg}
                </span>
              </div>

              {isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
