'use client'

// components/ui/ScoreSlider.tsx
// Single score slider with label, current value, max, and a gradient fill track.

import { cn } from '@/lib/utils'

interface ScoreSliderProps {
  label: string
  value: number
  max: number
  color?: string
  onChange: (val: number) => void
  disabled?: boolean
}

// Gradient map keyed by our color tokens
const GRADIENT_MAP: Record<string, string> = {
  indigo:  'from-indigo-600 to-indigo-400',
  violet:  'from-violet-600 to-violet-400',
  blue:    'from-blue-600 to-blue-400',
  pink:    'from-pink-600 to-pink-400',
  emerald: 'from-emerald-600 to-emerald-400',
  amber:   'from-amber-600 to-amber-400',
  teal:    'from-teal-600 to-teal-400',
}

const TEXT_MAP: Record<string, string> = {
  indigo:  'text-indigo-400',
  violet:  'text-violet-400',
  blue:    'text-blue-400',
  pink:    'text-pink-400',
  emerald: 'text-emerald-400',
  amber:   'text-amber-400',
  teal:    'text-teal-400',
}

export function ScoreSlider({
  label,
  value,
  max,
  color = 'indigo',
  onChange,
  disabled = false,
}: ScoreSliderProps) {
  const pct = Math.round((value / max) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-lg font-bold tabular-nums', TEXT_MAP[color] ?? 'text-indigo-400')}>
            {value}
          </span>
          <span className="text-xs text-slate-600">/ {max}</span>
        </div>
      </div>

      {/* Track container */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        {/* Filled portion */}
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-150', GRADIENT_MAP[color] ?? GRADIENT_MAP.indigo)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="score-range w-full cursor-pointer"
        aria-label={`${label} score`}
      />
    </div>
  )
}
