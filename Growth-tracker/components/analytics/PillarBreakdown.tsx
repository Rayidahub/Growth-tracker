'use client'

// components/analytics/PillarBreakdown.tsx
// Shows each score pillar as a horizontal bar with avg, best, trend arrow.
// No external chart library — pure Tailwind + SVG.

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ScorePillarStat } from '@/lib/analytics/computeStats'
import { cn } from '@/lib/utils'

interface PillarBreakdownProps {
  pillars: ScorePillarStat[]
}

const COLOR_CLASSES: Record<string, { bar: string; text: string; bg: string }> = {
  indigo:  { bar: 'from-indigo-600 to-indigo-400',   text: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  violet:  { bar: 'from-violet-600 to-violet-400',   text: 'text-violet-400',  bg: 'bg-violet-500/10' },
  blue:    { bar: 'from-blue-600 to-blue-400',       text: 'text-blue-400',    bg: 'bg-blue-500/10'   },
  pink:    { bar: 'from-pink-600 to-pink-400',       text: 'text-pink-400',    bg: 'bg-pink-500/10'   },
  emerald: { bar: 'from-emerald-600 to-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10'},
  amber:   { bar: 'from-amber-600 to-amber-400',     text: 'text-amber-400',   bg: 'bg-amber-500/10'  },
  teal:    { bar: 'from-teal-600 to-teal-400',       text: 'text-teal-400',    bg: 'bg-teal-500/10'   },
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
  if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
  return <Minus className="h-3.5 w-3.5 text-slate-500" />
}

export function PillarBreakdown({ pillars }: PillarBreakdownProps) {
  return (
    <div className="space-y-3">
      {pillars.map((p) => {
        const colors = COLOR_CLASSES[p.color] ?? COLOR_CLASSES.indigo
        const pct = Math.round((p.avg / p.max) * 100)
        const bestPct = Math.round((p.best / p.max) * 100)

        return (
          <div
            key={p.key}
            className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.07] transition-colors"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full bg-gradient-to-br', colors.bar)} />
                <span className="text-sm font-semibold text-white">{p.label}</span>
                <TrendIcon trend={p.trend} />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">best <span className="font-mono text-slate-300">{p.best}</span></span>
                <span className="text-slate-500">latest <span className="font-mono text-slate-300">{p.latest}</span></span>
                <span className={cn('font-bold font-mono text-base tabular-nums', colors.text)}>
                  {p.avg}<span className="text-xs font-normal text-slate-600">/{p.max}</span>
                </span>
              </div>
            </div>

            {/* Track */}
            <div className="relative h-2 w-full overflow-visible rounded-full bg-white/10">
              {/* Best score marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full bg-white/30"
                style={{ left: `${bestPct}%` }}
                title={`Best: ${p.best}`}
              />
              {/* Average fill */}
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', colors.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
              <span>avg {pct}% of max</span>
              <span>max {p.max} pts</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}