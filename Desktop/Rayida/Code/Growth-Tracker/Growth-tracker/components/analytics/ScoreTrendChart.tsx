'use client'

// components/analytics/ScoreTrendChart.tsx
// Pure SVG line chart — no recharts or chart.js dependency.
// Shows daily total score over the last N days with a gradient fill.

import { useMemo, useState } from 'react'
import type { DailyPoint } from '@/lib/analytics/computeStats'
import { cn } from '@/lib/utils'

interface ScoreTrendChartProps {
  data: DailyPoint[]
  height?: number
  showCommits?: boolean
}

const W = 600   // viewBox width
const H = 200   // viewBox height
const PAD = { top: 16, right: 16, bottom: 32, left: 32 }

function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return (outMin + outMax) / 2
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

export function ScoreTrendChart({ data, height = 200, showCommits = false }: ScoreTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const { scorePath, scoreAreaPath, commitBars, xTicks, yTicks, points } = useMemo(() => {
    if (data.length === 0) return { scorePath: '', scoreAreaPath: '', commitBars: [], xTicks: [], yTicks: [], points: [] }

    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom

    const scores = data.map((d) => d.totalScore)
    const minScore = 0
    const maxScore = 100

    const maxCommits = Math.max(...data.map((d) => d.commits), 1)

    const pts = data.map((d, i) => ({
      x: PAD.left + lerp(i, 0, data.length - 1, 0, chartW),
      y: PAD.top + lerp(d.totalScore, maxScore, minScore, 0, chartH),
      score: d.totalScore,
      commits: d.commits,
      label: d.displayDate,
      date: d.date,
    }))

    // Smooth path using cubic bezier
    const scorePath = pts.reduce((path, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`
      const prev = pts[i - 1]
      const cx = (prev.x + pt.x) / 2
      return `${path} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`
    }, '')

    const lastPt = pts[pts.length - 1]
    const firstPt = pts[0]
    const scoreAreaPath = `${scorePath} L ${lastPt.x} ${PAD.top + chartH} L ${firstPt.x} ${PAD.top + chartH} Z`

    // Commit bars
    const barW = Math.max(2, chartW / data.length - 4)
    const commitBars = showCommits ? pts.map((pt, i) => ({
      x: pt.x - barW / 2,
      y: PAD.top + chartH - lerp(data[i].commits, 0, maxCommits, 0, chartH * 0.3),
      w: barW,
      h: lerp(data[i].commits, 0, maxCommits, 0, chartH * 0.3),
      commits: data[i].commits,
    })) : []

    // Y axis ticks
    const yTicks = [0, 25, 50, 75, 100].map((val) => ({
      y: PAD.top + lerp(val, maxScore, minScore, 0, chartH),
      label: val.toString(),
    }))

    // X axis ticks — show ~6 evenly spaced
    const step = Math.max(1, Math.floor(data.length / 6))
    const xTicks = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((pt) => ({
      x: pt.x,
      label: pt.label,
    }))

    return { scorePath, scoreAreaPath, commitBars, xTicks, yTicks, points: pts }
  }, [data, showCommits])

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <p className="text-sm text-slate-500">No data yet — start logging daily!</p>
      </div>
    )
  }

  const hoveredPt = hovered !== null ? points[hovered] : null

  return (
    <div className="relative w-full rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm overflow-hidden">
      {/* Tooltip */}
      {hoveredPt && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm text-xs"
          style={{
            left: `${(hoveredPt.x / W) * 100}%`,
            top: 12,
            transform: hoveredPt.x > W * 0.7 ? 'translateX(-110%)' : 'translateX(8px)',
          }}
        >
          <p className="font-semibold text-white">{hoveredPt.label}</p>
          <p className="text-indigo-400">Score: <span className="font-bold">{hoveredPt.score}</span></p>
          {showCommits && <p className="text-slate-400">Commits: {hoveredPt.commits}</p>}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={t.y}
            x1={PAD.left} y1={t.y}
            x2={W - PAD.right} y2={t.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map((t) => (
          <text
            key={`yl-${t.y}`}
            x={PAD.left - 6}
            y={t.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="rgba(255,255,255,0.3)"
          >
            {t.label}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((t) => (
          <text
            key={`xl-${t.x}`}
            x={t.x}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.3)"
          >
            {t.label}
          </text>
        ))}

        {/* Commit bars (behind line) */}
        {commitBars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x} y={bar.y}
            width={bar.w} height={bar.h}
            rx="2"
            fill="rgba(167,139,250,0.2)"
          />
        ))}

        {/* Area fill */}
        <path d={scoreAreaPath} fill="url(#scoreGrad)" />

        {/* Score line */}
        <path
          d={scorePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover interaction dots */}
        {points.map((pt, i) => (
          <rect
            key={i}
            x={pt.x - 12}
            y={PAD.top}
            width={24}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
          />
        ))}

        {/* Dot on hovered point */}
        {hoveredPt && (
          <>
            <line
              x1={hoveredPt.x} y1={PAD.top}
              x2={hoveredPt.x} y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <circle cx={hoveredPt.x} cy={hoveredPt.y} r={5} fill="#6366f1" />
            <circle cx={hoveredPt.x} cy={hoveredPt.y} r={8} fill="rgba(99,102,241,0.3)" />
          </>
        )}
      </svg>
    </div>
  )
}
