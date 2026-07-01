'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { generateDayPlan, type GeneratedTask } from '@/lib/roadmap/generator'
import { getTaskCompletions, completeTask, uncompleteTask } from '@/lib/supabase/roadmap'
import { TaskItem } from './TaskItem'
import { Progress } from '@/components/ui/progress'
import { Map, CheckCircle2 } from 'lucide-react'

interface DailyTasksProps {
  userId: string
  startDate: string
  selectedStacks: string[]
}

export function DailyTasks({ userId, startDate, selectedStacks }: DailyTasksProps) {
  const today = new Date().toISOString().slice(0, 10)
  const plan = generateDayPlan(today, startDate, selectedStacks)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getTaskCompletions(userId, today).then((ids) => {
      setCompletedIds(ids)
    })
  }, [userId, today])

  const toggle = async (task: GeneratedTask) => {
    const isCompleted = completedIds.has(task.id)
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (isCompleted) next.delete(task.id)
      else next.add(task.id)
      return next
    })

    if (isCompleted) {
      await uncompleteTask(userId, task.id)
    } else {
      await completeTask(userId, task.id, today)
    }
  }

  const progress = plan.tasks.length
    ? Math.round((completedIds.size / plan.tasks.length) * 100)
    : 0

  if (selectedStacks.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Map className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Today&apos;s Roadmap</h3>
        </div>
        <p className="text-sm text-slate-400">
          No learning stacks selected.{' '}
          <Link href="/settings" className="text-indigo-400 hover:underline">Choose stacks</Link>{' '}
          to generate your personalised 96-week roadmap.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Today&apos;s Roadmap</h3>
        </div>
        <Link
          href="/roadmap"
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
        >
          View full roadmap
        </Link>
      </div>

      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Day {(plan.weekNumber - 1) * 7 + plan.dayOfWeek} · {plan.phase}</span>
          <span>{completedIds.size}/{plan.tasks.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="space-y-2">
        {plan.tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            completed={completedIds.has(task.id)}
            onToggle={() => toggle(task)}
          />
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="h-4 w-4" />
          All tasks completed today. Great work!
        </div>
      )}
    </div>
  )
}
