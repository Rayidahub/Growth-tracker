'use client'

import { Check } from 'lucide-react'
import type { GeneratedTask } from '@/lib/roadmap/generator'

interface TaskItemProps {
  task: GeneratedTask
  completed: boolean
  onToggle: () => void
}

export function TaskItem({ task, completed, onToggle }: TaskItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:bg-white/10"
    >
      <span className={`
        mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors
        ${completed ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-white/20 text-transparent'}
      `}>
        <Check className="h-3.5 w-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">{task.category}</span>
          {task.stackName && (
            <span className="text-xs text-slate-500">· {task.stackName}</span>
          )}
        </div>
        <p className={`text-sm font-medium ${completed ? 'text-slate-500 line-through' : 'text-white'}`}>
          {task.title}
        </p>
        <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
      </div>
    </button>
  )
}
