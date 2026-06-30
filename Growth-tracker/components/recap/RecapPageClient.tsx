'use client'

// components/recap/RecapPageClient.tsx
// Manages the state between RecapGenerator → RecapDisplay → RecapHistory.
// Handles switching between current week and past recaps.

import { useState } from 'react'
import { RecapGenerator } from '@/components/recap/RecapGenerator'
import { RecapDisplay } from '@/components/recap/RecapDisplay'
import { RecapHistory } from '@/components/recap/RecapHistory'
import type { WeeklyRecap, RecapData } from '@/lib/recap/types'
import { formatWeekRange } from '@/lib/recap/types'

interface RecapPageClientProps {
  currentRecap: WeeklyRecap | null
  history: Pick<WeeklyRecap, 'id' | 'week_start' | 'week_end' | 'recap_data' | 'generated_at'>[]
  weekStart: string
  weekEnd: string
}

export function RecapPageClient({
  currentRecap: initialRecap,
  history: initialHistory,
  weekStart,
  weekEnd,
}: RecapPageClientProps) {
  // Live-generated or server-fetched recap for current week
  const [liveRecap, setLiveRecap] = useState<{
    data: RecapData
    text: string
    generatedAt: string
    weekStart: string
    weekEnd: string
  } | null>(
    initialRecap
      ? {
          data: initialRecap.recap_data,
          text: initialRecap.recap_text,
          generatedAt: initialRecap.generated_at,
          weekStart: initialRecap.week_start,
          weekEnd: initialRecap.week_end,
        }
      : null
  )

  // Selected past recap (null = showing current week)
  const [selectedPast, setSelectedPast] = useState<{
    id: string
    data: RecapData
    weekStart: string
    weekEnd: string
    generatedAt: string
  } | null>(null)

  const [history, setHistory] = useState(initialHistory)

  const handleRecapReady = (data: RecapData, text: string, ws: string) => {
    const generatedAt = new Date().toISOString()
    setLiveRecap({ data, text, generatedAt, weekStart: ws, weekEnd })
    setSelectedPast(null)

    // Update history list if this week isn't in it yet
    setHistory((prev) => {
      const exists = prev.some((r) => r.week_start === ws)
      if (exists) return prev.map((r) =>
        r.week_start === ws ? { ...r, recap_data: data, generated_at: generatedAt } : r
      )
      return [{ id: 'new', week_start: ws, week_end: weekEnd, recap_data: data, generated_at: generatedAt }, ...prev]
    })
  }

  const handleSelectPast = (r: typeof history[0]) => {
    if (r.week_start === weekStart) {
      setSelectedPast(null) // back to current
    } else {
      setSelectedPast({
        id: r.id,
        data: r.recap_data,
        weekStart: r.week_start,
        weekEnd: r.week_end,
        generatedAt: r.generated_at,
      })
    }
  }

  const displayRecap = selectedPast
    ? { data: selectedPast.data, text: '', generatedAt: selectedPast.generatedAt, weekStart: selectedPast.weekStart, weekEnd: selectedPast.weekEnd }
    : liveRecap

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

      {/* Left column: generator + history */}
      <div className="space-y-4 lg:col-span-1">
        <RecapGenerator
          hasExistingRecap={!!liveRecap}
          existingGeneratedAt={liveRecap?.generatedAt}
          onRecapReady={handleRecapReady}
        />

        {history.length > 0 && (
          <RecapHistory
            recaps={history}
            activeId={selectedPast?.id ?? (liveRecap ? 'current' : null)}
            onSelect={handleSelectPast}
          />
        )}
      </div>

      {/* Right column: display */}
      <div className="lg:col-span-2">
        {displayRecap ? (
          <RecapDisplay
            recap={displayRecap.data}
            recapText={displayRecap.text}
            weekStart={displayRecap.weekStart}
            weekEnd={displayRecap.weekEnd}
            generatedAt={displayRecap.generatedAt}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
            <div className="text-center px-8">
              <div className="text-3xl mb-3">✨</div>
              <p className="text-sm font-semibold text-white mb-1">No recap yet for {formatWeekRange(weekStart, weekEnd)}</p>
              <p className="text-xs text-slate-500">
                Click "Generate This Week's Recap" to get Claude's analysis of your logs.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
