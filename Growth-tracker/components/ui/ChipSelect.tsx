'use client'

// components/ui/ChipSelect.tsx
// Pill-style multi-select. Pass options as strings; selected ones highlight.

import { cn } from '@/lib/utils'

interface ChipSelectProps {
  options: readonly string[]
  value: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
  singleSelect?: boolean
}

export function ChipSelect({
  options,
  value,
  onChange,
  disabled = false,
  singleSelect = false,
}: ChipSelectProps) {
  const toggle = (option: string) => {
    if (disabled) return
    if (singleSelect) {
      onChange(value.includes(option) ? [] : [option])
    } else {
      onChange(
        value.includes(option)
          ? value.filter((v) => v !== option)
          : [...value, option]
      )
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            disabled={disabled}
            className={cn(
              'rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-150',
              'border ring-0 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
              selected
                ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
