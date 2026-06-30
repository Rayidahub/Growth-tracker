'use client'

// components/recap/RecapGenerator.tsx
// The "Generate Recap" button with loading/streaming state.
// On success, calls onRecapReady with the full RecapData.

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import type { RecapData } from '@/lib/recap/types'
import { formatWeekRange, getCurrentWeekStart, getCurrentWeekEnd } from '@/lib/recap/types'
import { cn } from '@/lib/utils'

interface RecapGeneratorProps {
  hasExistingRecap: boolean
  existingGeneratedAt?: string
  onRecapReady: (recap: RecapData, recapText: string, weekStart: string) => void
}

const LOADING_MESSAGES = [
  'Reading your week\'s logs…',
  'Analysing score patterns…',
  'Comparing to last week…',
  'Identifying your wins…',
  'Finding growth opportunities…',
  'Crafting your action items…',
  'Finalising your recap…',
]

export function RecapGenerator({
  hasExistingRecap,
  existingGeneratedAt,
  onRecapReady,
}: RecapGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [msgIndex, setMsgIndex] = useState(0)

  const weekStart = getCurrentWeekStart()
  const weekEnd   = getCurrentWeekEnd()
  const weekLabel = formatWeekRange(weekStart, weekEnd)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setLoadingMsg(LOADING_MESSAGES[0])
    setMsgIndex(0)

    // Cycle through loading messages
    const interval = setInterval(() => {
      setMsgIndex((i) => {
        const next = Math.min(i + 1, LOADING_MESSAGES.length - 1)
        setLoadingMsg(LOADING_MESSAGES[next])
        return next
      })
    }, 2800)

    try {
      const res = await fetch('/api/recap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }

      onRecapReady(data.recap, data.recapText, data.weekStart)
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error. Please try again.')
    } finally {
      clearInterval(interval)
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-indigo-500/30">
            <Sparkles className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <p className="text-base font-bold text-white">AI Weekly Recap</p>
            <p className="text-xs text-slate-400">{weekLabel}</p>
          </div>
        </div>

        {hasExistingRecap && existingGeneratedAt && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Last generated</p>
            <p className="text-xs text-slate-400">
              {new Date(existingGeneratedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Claude analyses your logs from this week vs last week — surfacing wins, gaps, and 3-5 prioritised action items to focus on next week.
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-4 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 mb-4">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400 flex-shrink-0" />
          <span className="text-sm text-indigo-300 transition-all duration-500">{loadingMsg}</span>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={cn(
          'flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-all duration-200',
          hasExistingRecap
            ? 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500',
          isGenerating && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isGenerating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
        ) : hasExistingRecap ? (
          <><RefreshCw className="h-4 w-4" /> Regenerate Recap</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Generate This Week's Recap</>
        )}
      </button>

      {hasExistingRecap && (
        <p className="mt-2.5 text-center text-xs text-slate-600">
          Regenerating will overwrite the existing recap for this week
        </p>
      )}
    </div>
  )
}
