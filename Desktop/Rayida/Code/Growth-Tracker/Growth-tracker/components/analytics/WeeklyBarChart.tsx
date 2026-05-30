'use client'

// components/analytics/WeeklyBarChart.tsx
// SVG bar chart showing weekly avg scores and focus hours side by side.

import { useState, useMemo } from 'react'
import type { WeeklyBucket } from '@/lib/analytics/computeStats'

interface WeeklyBarChartProps {
  data: WeeklyBucket[]
  metric?: 'avgScore' | 'totalHours' | 'totalCommits'
}

const METRIC_CONFIG = {
  avgScore:    { label: 'Avg Score',    max: 100, color: '#6366f1', gradStart: '#818cf8', gradEnd: '#6366f1', unit: 'pts' },
  totalHours:  { label: 'Focus Hours',  max: 50,  color: '#34d399', gradStart: '#6ee7b7', gradEnd: '#10b981', unit: 'h'   },
  totalCommits:{ label: 'Commits',      max: 50,  color: '#f59e0b', gradStart: '#fcd34d', gradEnd: '#d97706', unit: ''    },
}

const W = 560
const H = 160
const PAD = { top: 12, right: 8, bottom: 28, left: 28 }

export function WeeklyBarChart({ data, metric = 'avgScore' }: WeeklyBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const cfg = METRIC_CONFIG[metric]

  const bars = useMemo(() => {
    if (data.length === 0) return []
    const chartW = W - PAD.left - PAD.right
    const chartH = H - PAD.top - PAD.bottom
    const barW = Math.max(8, chartW / data.length - 6)
    const dynamicMax = Math.max(...data.map((d) => d[metric]), cfg.max * 0.3)

    return data.map((d, i) => {
      const val = d[metric]
      const x = PAD.left + (i / data.length) * chartW + (chartW / data.length - barW) / 2
      const barH = (val / dynamicMax) * chartH
      const y = PAD.top + chartH - barH

      return { x, y, w: barW, h: barH, val, label: d.weekLabel, logCount: d.logCount }
    })
  }, [data, metric, cfg.max])

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <p className="text-xs text-slate-500">Not enough data yet</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl border border-white/10 bg-white/5 p-3 overflow-hidden">
      {/* Hovered tooltip */}
      {hovered !== null && bars[hovered] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(bars[hovered].x / W) * 100}%`,
            top: 8,
            transform: bars[hovered].x > W * 0.65 ? 'translateX(-110%)' : 'translateX(8px)',
          }}
        >
          <p className="font-semibold text-white">{bars[hovered].label}</p>
          <p style={{ color: cfg.color }}>{cfg.label}: <strong>{bars[hovered].val}{cfg.unit}</strong></p>
          <p className="text-slate-500">{bars[hovered].logCount} log{bars[hovered].logCount !== 1 ? 's' : ''}</p>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={`barGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cfg.gradStart} stopOpacity="0.9" />
            <stop offset="100%" stopColor={cfg.gradEnd} stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Horizontal guide lines */}
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + (1 - f) * (H - PAD.top - PAD.bottom)
          return (
            <line key={f} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          )
        })}

        {/* Bars */}
        {bars.map((bar, i) => {
          const isHovered = hovered === i
          return (
            <g key={i} onMouseEnter={() => setHovered(i)}>
              {/* Background hit area */}
              <rect
                x={bar.x - 3} y={PAD.top}
                width={bar.w + 6} height={H - PAD.top - PAD.bottom}
                fill="transparent"
              />
              {/* Bar */}
              <rect
                x={bar.x} y={bar.y}
                width={bar.w} height={bar.h}
                rx="4"
                fill={`url(#barGrad-${metric})`}
                opacity={isHovered ? 1 : 0.75}
                style={{ transition: 'opacity 0.15s' }}
              />
              {/* Glow on hover */}
              {isHovered && (
                <rect
                  x={bar.x - 1} y={bar.y - 1}
                  width={bar.w + 2} height={bar.h + 2}
                  rx="5"
                  fill="none"
                  stroke={cfg.gradStart}
                  strokeWidth="1.5"
                  opacity="0.5"
                />
              )}
              {/* X label */}
              <text
                x={bar.x + bar.w / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.25)"
              >
                {bar.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}