'use client'

import { useEffect, useState } from 'react'
import { generateWeekPlan, type GeneratedTask, getWeekRange } from '@/lib/roadmap/generator'
import { getTaskCompletions, completeTask, uncompleteTask } from '@/lib/supabase/roadmap'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface RoadmapWeekViewProps {
  userId: string
  startDate: string
  selectedStacks: string[]
  initialWeek: number
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function RoadmapWeekView({ userId, startDate, selectedStacks, initialWeek }: RoadmapWeekViewProps) {
  const [weekNumber, setWeekNumber] = useState(initialWeek)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const plan = generateWeekPlan(weekNumber, startDate, selectedStacks)
  const { weekStart, weekEnd } = getWeekRange(startDate, weekNumber)

  useEffect(() => {
    const start = new Date(weekStart + 'T00:00:00')
    const end = new Date(weekEnd + 'T00:00:00')

    async function load() {
      const allIds = new Set<string>()
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        const ids = await getTaskCompletions(userId, dateStr)
        ids.forEach((id) => allIds.add(id))
      }
      setCompletedIds(allIds)
    }

    load()
  }, [userId, weekStart, weekEnd])

  const toggle = async (task: GeneratedTask) => {
    const dateStr = task.id.split(':')[1]
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
      await completeTask(userId, task.id, dateStr)
    }
  }

  const tasksByDay: GeneratedTask[][] = Array.from({ length: 7 }, () => [])
  for (const task of plan.tasks) {
    tasksByDay[task.dayOfWeek].push(task)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
        <button
          type="button"
          onClick={() => setWeekNumber((w) => Math.max(1, w - 1))}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">Week {weekNumber} · {plan.phase}</p>
          <p className="text-xs text-slate-500">{weekStart} – {weekEnd}</p>
        </div>
        <button
          type="button"
          onClick={() => setWeekNumber((w) => w + 1)}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {selectedStacks.length === 0 ? (
        <p className="text-center text-sm text-slate-400">
          Choose learning stacks in Settings to see your roadmap.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {tasksByDay.map((tasks, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {DAY_LABELS[idx]}
              </p>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="text-xs">
                    <button
                      type="button"
                      onClick={() => toggle(task)}
                      className={`flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors ${
                        completedIds.has(task.id) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full bg-indigo-500/50" />
                      <span className="line-clamp-3">{task.title}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
