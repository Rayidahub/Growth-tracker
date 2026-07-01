'use client'

// components/recap/RecapDisplay.tsx
// Renders a fully structured RecapData with all sections:
// intro, wins, gaps, action items, pillar comparison, week summary.

import { useState } from 'react'
import {
  Trophy, AlertTriangle, CheckSquare, BarChart2,
  TrendingUp, TrendingDown, Minus, Copy, Check,
  Sparkles, Target, Zap,
} from 'lucide-react'
import type { RecapData, PillarComparison } from '@/lib/recap/types'
import { cn } from '@/lib/utils'

interface RecapDisplayProps {
  recap: RecapData
  recapText: string
  weekStart: string
  weekEnd: string
  generatedAt?: string
}

// ── Pillar comparison bar ─────────────────────────────────────

function PillarBar({ p }: { p: PillarComparison }) {
  const thisPct  = Math.round((p.thisWeek / p.max) * 100)
  const lastPct  = Math.round((p.lastWeek / p.max) * 100)
  const changePct = Math.round(((p.thisWeek - p.lastWeek) / p.max) * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{p.label}</span>
        <div className="flex items-center gap-1.5">
          {p.trend !== 'flat' && (
            <span className={cn(
              'flex items-center gap-0.5 font-mono text-xs',
              p.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
            )}>
              {p.trend === 'up'
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              {p.trend === 'up' ? '+' : ''}{changePct}%
            </span>
          )}
          {p.trend === 'flat' && <Minus className="h-3 w-3 text-slate-600" />}
          <span className="font-mono text-white">{p.thisWeek.toFixed(1)}</span>
          <span className="text-slate-600">/{p.max}</span>
        </div>
      </div>

      {/* This week bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        {/* Last week ghost */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/15 transition-all duration-500"
          style={{ width: `${lastPct}%` }}
        />
        {/* This week */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-700',
            p.trend === 'up'   ? 'from-emerald-600 to-emerald-400' :
            p.trend === 'down' ? 'from-red-600 to-red-400'         :
                                 'from-indigo-600 to-indigo-400'
          )}
          style={{ width: `${thisPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>prev: {p.lastWeek.toFixed(1)}</span>
        <span>max: {p.max}</span>
      </div>
    </div>
  )
}

// ── Priority badge ────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cn(
      'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ring-1 flex-shrink-0',
      priority === 'high'   ? 'bg-red-500/20 text-red-300 ring-red-500/30'     :
      priority === 'medium' ? 'bg-amber-500/20 text-amber-300 ring-amber-500/30' :
                              'bg-slate-500/20 text-slate-300 ring-slate-500/30'
    )}>
      {priority}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────

export function RecapDisplay({
  recap,
  recapText,
  generatedAt,
}: RecapDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(recapText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const scoreChange = recap.weekSummary.thisWeekAvg - recap.weekSummary.lastWeekAvg
  const scoreChangePositive = scoreChange > 0

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Meta bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span className="text-xs text-slate-400">
            Generated {generatedAt ? new Date(generatedAt).toLocaleString() : 'just now'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy markdown'}
        </button>
      </div>

      {/* Intro card */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30 flex-shrink-0 mt-0.5">
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{recap.intro}</p>
        </div>
      </div>

      {/* Score summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'This Week Avg',
            value: recap.weekSummary.thisWeekAvg,
            suffix: '/100',
            sub: scoreChange !== 0
              ? `${scoreChangePositive ? '+' : ''}${scoreChange} vs last week`
              : 'Same as last week',
            color: scoreChangePositive ? 'text-emerald-400' : scoreChange < 0 ? 'text-red-400' : 'text-slate-400',
          },
          { label: 'Deep Work', value: recap.weekSummary.totalHours, suffix: 'h', sub: 'this week', color: 'text-indigo-400' },
          { label: 'Commits', value: recap.weekSummary.totalCommits, suffix: '', sub: 'this week', color: 'text-violet-400' },
          { label: 'Logs Filed', value: recap.weekSummary.logCount, suffix: '/7', sub: recap.weekSummary.mostActiveDay ? `Best: ${recap.weekSummary.mostActiveDay}` : '', color: 'text-amber-400' },
        ].map(({ label, value, suffix, sub, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className={cn('text-xl font-black tabular-nums', color)}>
              {value}<span className="text-xs font-normal text-slate-600 ml-0.5">{suffix}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Wins */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Wins</h3>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">{recap.wins.length}</span>
        </div>
        <div className="space-y-3">
          {recap.wins.map((win, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{win.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{win.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gaps */}
      {recap.gaps.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">Gaps to Address</h3>
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">{recap.gaps.length}</span>
          </div>
          <div className="space-y-4">
            {recap.gaps.map((gap, i) => (
              <div key={i} className="rounded-xl border border-orange-500/10 bg-orange-500/5 p-3.5">
                <p className="text-sm font-semibold text-orange-300 mb-1">{gap.area}</p>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{gap.observation}</p>
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0">→</span>
                  <p className="text-xs text-emerald-300 italic leading-relaxed">{gap.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Action Items for Next Week</h3>
        </div>
        <div className="space-y-2.5">
          {recap.actionItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-400 flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-relaxed">{item.action}</p>
                <p className="text-xs text-slate-600 mt-0.5">affects: {item.pillar}</p>
              </div>
              <PriorityBadge priority={item.priority} />
            </div>
          ))}
        </div>
      </div>

      {/* Pillar comparison */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Pillar Comparison</h3>
          <span className="text-xs text-slate-500 ml-auto">this week vs last week</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {recap.pillarComparisons.map((p) => (
            <PillarBar key={p.key} p={p} />
          ))}
        </div>
      </div>

      {/* Next week focus */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30 flex-shrink-0 mt-0.5">
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Next Week Focus</p>
            <p className="text-sm text-slate-200 leading-relaxed">{recap.nextWeekFocus}</p>
          </div>
        </div>
      </div>

    </div>
  )
}
