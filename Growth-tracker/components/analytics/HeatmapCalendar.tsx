'use client'

// components/analytics/HeatmapCalendar.tsx
// GitHub-style contribution heatmap for the past 52 weeks.
// Shows score intensity with colour shading.

import { useMemo, useState } from 'react'
import type { HeatmapDay } from '@/lib/analytics/computeStats'
interface HeatmapCalendarProps {
  days: HeatmapDay[]
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function scoreToFill(score: number | null): string {
  if (score === null) return 'rgba(255,255,255,0.04)'
  if (score >= 85) return '#22c55e'   // emerald-500
  if (score >= 70) return '#6366f1'   // indigo-500
  if (score >= 55) return '#8b5cf6'   // violet-500
  if (score >= 40) return '#f59e0b'   // amber-500
  return '#ef4444'                    // red-500 (logged but low score)
}

function scoreToOpacity(score: number | null): number {
  if (score === null) return 1
  if (score >= 85) return 0.9
  if (score >= 70) return 0.75
  if (score >= 55) return 0.6
  if (score >= 40) return 0.55
  return 0.5
}

const CELL = 13  // px per cell
const GAP  = 2   // px gap

export function HeatmapCalendar({ days }: HeatmapCalendarProps) {
  const [tooltip, setTooltip] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null)

  const { weeks, monthLabels } = useMemo(() => {
    // Pad start so first day is Sunday
    const padded: (HeatmapDay | null)[] = []
    const firstDOW = days[0]?.dayOfWeek ?? 0
    for (let i = 0; i < firstDOW; i++) padded.push(null)
    padded.push(...days)

    // Group into columns of 7
    const weeks: (HeatmapDay | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7))
    }

    // Month labels — find first week of each month
    const monthLabels: { label: string; col: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, col) => {
      const firstReal = week.find(Boolean)
      if (!firstReal) return
      const m = new Date(firstReal.date + 'T00:00:00').getMonth()
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col })
        lastMonth = m
      }
    })

    return { weeks, monthLabels }
  }, [days])

  const svgW = weeks.length * (CELL + GAP) + 24
  const svgH = 7 * (CELL + GAP) + 24

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-white">52-Week Activity</p>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Less</span>
          {[null, 40, 55, 70, 85].map((s, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-sm"
              style={{ background: scoreToFill(s), opacity: scoreToOpacity(s) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="relative" onMouseLeave={() => setTooltip(null)}>
        <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
          {/* Day-of-week labels */}
          {[1, 3, 5].map((d) => (
            <text
              key={d}
              x={0}
              y={20 + d * (CELL + GAP) + CELL / 2}
              fontSize="9"
              fill="rgba(255,255,255,0.25)"
              dominantBaseline="middle"
            >
              {DAYS[d].slice(0, 1)}
            </text>
          ))}

          {/* Month labels */}
          {monthLabels.map(({ label, col }) => (
            <text
              key={`${label}-${col}`}
              x={20 + col * (CELL + GAP)}
              y={10}
              fontSize="9"
              fill="rgba(255,255,255,0.3)"
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, col) =>
            week.map((day, row) => {
              if (!day) return null
              const x = 20 + col * (CELL + GAP)
              const y = 16 + row * (CELL + GAP)
              return (
                <rect
                  key={day.date}
                  x={x} y={y}
                  width={CELL} height={CELL}
                  rx="2.5"
                  fill={scoreToFill(day.score)}
                  opacity={scoreToOpacity(day.score)}
                  style={{ cursor: day.score !== null ? 'pointer' : 'default', transition: 'opacity 0.1s' }}
                  onMouseEnter={() => {
                    setTooltip({ day, x: col * (CELL + GAP), y: row * (CELL + GAP) })
                  }}
                />
              )
            })
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm text-xs"
            style={{
              left: tooltip.x + 32,
              top: tooltip.y + 12,
              transform: tooltip.x > svgW * 0.6 ? 'translateX(-120%)' : undefined,
            }}
          >
            <p className="font-semibold text-white">{tooltip.day.displayDate}</p>
            {tooltip.day.score !== null ? (
              <p className="text-indigo-400">Score: <span className="font-bold">{tooltip.day.score}</span>/100</p>
            ) : (
              <p className="text-slate-500">No log</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
