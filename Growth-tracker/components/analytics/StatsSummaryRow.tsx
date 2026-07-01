'use client'

// components/analytics/StatsSummaryRow.tsx
// Compact 4-col grid of key stats with icons, values, and trend indicators.

import {
  TrendingUp, TrendingDown, Flame, Clock,
  GitCommit, Award,
} from 'lucide-react'
import type { OverallStats } from '@/lib/analytics/computeStats'
import { cn } from '@/lib/utils'

interface StatsSummaryRowProps {
  stats: OverallStats
}

export function StatsSummaryRow({ stats }: StatsSummaryRowProps) {
  const velocityPositive = stats.scoreVelocity > 0

  const cards = [
    {
      icon: <Award className="h-4 w-4" />,
      label: 'Average Score',
      value: stats.avgScore,
      suffix: '/100',
      sub: stats.bestScore ? `Best: ${stats.bestScore}` : '—',
      accent: 'indigo',
      extra: stats.scoreVelocity !== 0 ? (
        <span className={cn(
          'flex items-center gap-0.5 text-xs font-medium',
          velocityPositive ? 'text-emerald-400' : 'text-red-400'
        )}>
          {velocityPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {velocityPositive ? '+' : ''}{stats.scoreVelocity} vs prev 4w
        </span>
      ) : null,
    },
    {
      icon: <Flame className="h-4 w-4" />,
      label: 'Current Streak',
      value: stats.currentStreak,
      suffix: stats.currentStreak === 1 ? ' day' : ' days',
      sub: `Longest: ${stats.longestStreak}d`,
      accent: 'amber',
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Focus Hours',
      value: stats.totalDeepWorkHours,
      suffix: 'h total',
      sub: `~${stats.avgDeepWorkPerDay}h/day avg`,
      accent: 'emerald',
    },
    {
      icon: <GitCommit className="h-4 w-4" />,
      label: 'Commits',
      value: stats.totalCommits,
      suffix: ' total',
      sub: `${stats.completionRate}% log rate`,
      accent: 'violet',
    },
  ]

  const ACCENT: Record<string, { text: string; icon: string; ring: string; grad: string }> = {
    indigo:  { text: 'text-indigo-400',  icon: 'text-indigo-400',  ring: 'ring-indigo-500/20',  grad: 'from-indigo-500/20 to-violet-500/10'  },
    amber:   { text: 'text-amber-400',   icon: 'text-amber-400',   ring: 'ring-amber-500/20',   grad: 'from-amber-500/20 to-orange-500/10'   },
    emerald: { text: 'text-emerald-400', icon: 'text-emerald-400', ring: 'ring-emerald-500/20', grad: 'from-emerald-500/20 to-teal-500/10'   },
    violet:  { text: 'text-violet-400',  icon: 'text-violet-400',  ring: 'ring-violet-500/20',  grad: 'from-violet-500/20 to-pink-500/10'    },
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ icon, label, value, suffix, sub, accent, extra }) => {
        const a = ACCENT[accent]
        return (
          <div
            key={label}
            className={cn(
              'rounded-2xl border border-white/10 bg-gradient-to-br p-4 ring-1 backdrop-blur-sm',
              a.grad, a.ring
            )}
          >
            <div className={cn('mb-2', a.icon)}>{icon}</div>
            <div className={cn('text-2xl font-black tabular-nums leading-none', a.text)}>
              {value}<span className="text-xs font-normal text-slate-500 ml-0.5">{suffix}</span>
            </div>
            <div className="mt-1.5 text-xs text-slate-500">{label}</div>
            <div className="mt-0.5 text-xs text-slate-600">{sub}</div>
            {extra && <div className="mt-1.5">{extra}</div>}
          </div>
        )
      })}
    </div>
  )
}
