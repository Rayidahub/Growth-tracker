'use client'

// components/analytics/AnalyticsControls.tsx
// Range switcher buttons — updates ?range= query param to re-fetch data.

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const RANGES = [
  { label: '7d',  value: 7   },
  { label: '14d', value: 14  },
  { label: '30d', value: 30  },
  { label: '90d', value: 90  },
  { label: '1y',  value: 365 },
]

interface AnalyticsControlsProps {
  currentRange: number
}

export function AnalyticsControls({ currentRange }: AnalyticsControlsProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
      {RANGES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => router.push(`/analytics?range=${value}`)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            currentRange === value
              ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
