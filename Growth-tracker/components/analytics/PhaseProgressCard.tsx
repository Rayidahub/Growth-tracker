'use client'

// components/analytics/PhaseProgressCard.tsx
// Shows phase goal, days in phase, avg score vs goal, and advance readiness.

import { CheckCircle2, Lock, ChevronRight, Flame } from 'lucide-react'
import type { PhaseProgress } from '@/lib/analytics/computeStats'
import { cn } from '@/lib/utils'

interface PhaseProgressCardProps {
  phase: PhaseProgress
  onAdvanceRequest?: () => void
}

const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']

const PHASE_DESCRIPTIONS: Record<string, string> = {
  'Phase 1': 'Foundation — building consistent habits and shipping daily',
  'Phase 2': 'Momentum — raising quality and depth across all pillars',
  'Phase 3': 'Mastery — sustained high performance and public output',
  'Phase 4': 'Leadership — mentoring, open source, thought leadership',
}

export function PhaseProgressCard({ phase, onAdvanceRequest }: PhaseProgressCardProps) {
  const phaseIndex = PHASES.indexOf(phase.currentPhase)
  const pct = phase.progressToGoal
  const isReady = phase.readyToAdvance
  const isMaxPhase = phaseIndex === PHASES.length - 1

  return (
    <div className={cn(
      'rounded-2xl border p-5 backdrop-blur-sm',
      isReady
        ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5'
        : 'border-white/10 bg-white/5'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isReady && <Flame className="h-4 w-4 text-emerald-400" />}
            <span className="text-sm font-bold text-white">{phase.currentPhase}</span>
            {isReady && (
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                Ready to advance
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {PHASE_DESCRIPTIONS[phase.currentPhase] ?? 'Keep pushing forward'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white tabular-nums">{phase.daysInPhase}</p>
          <p className="text-xs text-slate-500">days in phase</p>
        </div>
      </div>

      {/* Phase stepper */}
      <div className="flex items-center gap-1.5 mb-5">
        {PHASES.map((p, i) => {
          const isCurrent = i === phaseIndex
          const isCompleted = i < phaseIndex
          return (
            <div key={p} className="flex items-center gap-1.5">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all',
                isCompleted ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' :
                isCurrent   ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40' :
                              'bg-white/5 text-slate-600 ring-1 ring-white/10'
              )}>
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                 isCurrent   ? i + 1 :
                               <Lock className="h-3 w-3" />}
              </div>
              {i < PHASES.length - 1 && (
                <div className={cn(
                  'h-0.5 w-6 rounded-full',
                  isCompleted ? 'bg-emerald-500/40' : 'bg-white/10'
                )} />
              )}
            </div>
          )
        })}
        <div className="ml-2 text-xs text-slate-500">{phase.currentPhase}</div>
      </div>

      {/* Score goal progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">14-day avg vs phase goal</span>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'font-bold tabular-nums text-base',
              isReady ? 'text-emerald-400' : 'text-indigo-400'
            )}>
              {phase.avgScoreThisPhase}
            </span>
            <span className="text-slate-600">/ {phase.scoreGoal} goal</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r transition-all duration-700',
              isReady ? 'from-emerald-600 to-emerald-400' : 'from-indigo-600 to-violet-400'
            )}
            style={{ width: `${pct}%` }}
          />
          {/* Goal marker at 100% */}
          <div className="absolute right-0 top-0 h-full w-0.5 bg-white/20 rounded-full" />
        </div>

        <div className="flex justify-between text-[10px] text-slate-600">
          <span>{pct}% of goal</span>
          <span>Need ≥{phase.scoreGoal} avg for 7+ days</span>
        </div>
      </div>

      {/* Advance CTA */}
      {isReady && !isMaxPhase && onAdvanceRequest && (
        <button
          onClick={onAdvanceRequest}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition-all"
        >
          Advance to {PHASES[phaseIndex + 1]}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {isMaxPhase && isReady && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Maximum phase achieved
        </div>
      )}
    </div>
  )
}