'use client'

import { STACKS, STACK_CATEGORIES } from '@/lib/roadmap/stacks'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StackSelectorProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function StackSelector({ selected, onChange }: StackSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const stacksByCategory = STACK_CATEGORIES.map((cat) => ({
    ...cat,
    stacks: STACKS.filter((s) => s.category === cat.value),
  })).filter((group) => group.stacks.length > 0)

  return (
    <div className="space-y-5">
      {stacksByCategory.map((group) => (
        <div key={group.value}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.stacks.map((stack) => {
              const isSelected = selected.includes(stack.id)
              return (
                <button
                  key={stack.id}
                  type="button"
                  onClick={() => toggle(stack.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-all',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/25'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                  {stack.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {selected.length === 0 && (
        <p className="text-xs text-slate-500">Select at least one stack to generate your roadmap.</p>
      )}
    </div>
  )
}
