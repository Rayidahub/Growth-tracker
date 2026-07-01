// lib/roadmap/generator.ts
// On-demand 96-week task generator driven by user-selected learning stacks.

import { getStack, type StackConfig, type TaskCategory } from './stacks'

export const TOTAL_WEEKS = 96
export const DAYS_PER_WEEK = 7
export const WEEKS_PER_PHASE = 24

export const PHASES = ['Foundation', 'Build', 'Advanced', 'Ship']

export const CATEGORIES: TaskCategory[] = [
  'coding',
  'product',
  'documentation',
  'portfolio',
  'community',
  'design',
  'career',
]

export interface GeneratedTask {
  id: string
  category: TaskCategory
  title: string
  description: string
  stackId: string | null
  stackName: string | null
  weekNumber: number
  dayOfWeek: number
  phase: string
}

export interface DayPlan {
  date: string
  weekNumber: number
  dayOfWeek: number
  phase: string
  tasks: GeneratedTask[]
}

export interface WeekPlan {
  weekNumber: number
  phase: string
  weekStart: string
  weekEnd: string
  tasks: GeneratedTask[]
}

export function getPhaseForWeek(weekNumber: number): string {
  const idx = Math.min(PHASES.length - 1, Math.floor((weekNumber - 1) / WEEKS_PER_PHASE))
  return PHASES[idx]
}

export function getWeekAndDay(startDate: string, targetDate: string): { weekNumber: number; dayOfWeek: number } {
  const start = new Date(startDate + 'T00:00:00')
  const target = new Date(targetDate + 'T00:00:00')
  const dayIndex = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(dayIndex / DAYS_PER_WEEK) + 1
  const dayOfWeek = ((dayIndex % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
  return { weekNumber, dayOfWeek }
}

export function getWeekRange(startDate: string, weekNumber: number): { weekStart: string; weekEnd: string } {
  const start = new Date(startDate + 'T00:00:00')
  const weekStart = new Date(start.getTime())
  weekStart.setDate(start.getDate() + (weekNumber - 1) * DAYS_PER_WEEK)
  const weekEnd = new Date(weekStart.getTime())
  weekEnd.setDate(weekStart.getDate() + DAYS_PER_WEEK - 1)
  return { weekStart: toISODate(weekStart), weekEnd: toISODate(weekEnd) }
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pickTopic(stack: StackConfig, weekNumber: number, dayOfWeek: number): string {
  const idx = ((weekNumber - 1) * DAYS_PER_WEEK + dayOfWeek) % stack.topics.length
  return stack.topics[idx]
}

function pickProject(stack: StackConfig, weekNumber: number): string {
  const idx = (weekNumber - 1) % stack.projectIdeas.length
  return stack.projectIdeas[idx]
}

function pickResource(stack: StackConfig, weekNumber: number): { title: string; url: string } {
  const idx = weekNumber % stack.resources.length
  return stack.resources[idx]
}

function buildStackTask(
  category: TaskCategory,
  stack: StackConfig,
  weekNumber: number,
  dayOfWeek: number,
  date: string
): GeneratedTask {
  const phase = getPhaseForWeek(weekNumber)
  const topic = pickTopic(stack, weekNumber, dayOfWeek)
  const project = pickProject(stack, weekNumber)
  const resource = pickResource(stack, weekNumber)

  let title: string
  let description: string

  if (phase === 'Foundation') {
    title = `Study ${topic}`
    description = `Learn "${topic}" from the ${stack.name} stack. Resource: ${resource.title} (${resource.url}).`
  } else if (phase === 'Build') {
    title = `Build with ${topic}`
    description = `Apply "${topic}" in ${stack.name} by working on: ${project}.`
  } else if (phase === 'Advanced') {
    title = `Deep dive: ${topic}`
    description = `Advanced practice in ${stack.name}: ${topic}. Try extending ${project}.`
  } else {
    title = `Ship ${stack.name} work`
    description = `Polish and publish something using ${stack.name}. Project idea: ${project}.`
  }

  return {
    id: `task:${date}:${category}:${stack.id}:${weekNumber}:${dayOfWeek}`,
    category,
    title,
    description,
    stackId: stack.id,
    stackName: stack.name,
    weekNumber,
    dayOfWeek,
    phase,
  }
}

function buildGenericTask(category: TaskCategory, weekNumber: number, dayOfWeek: number, date: string): GeneratedTask {
  const phase = getPhaseForWeek(weekNumber)
  const templates: Record<TaskCategory, { title: string; description: string }> = {
    coding: {
      title: 'Solve a coding problem',
      description: 'Spend 30–60 minutes solving an algorithm or system-design problem.',
    },
    product: {
      title: 'Product thinking practice',
      description: 'Analyse a product you use. Write one improvement and how you would measure it.',
    },
    documentation: {
      title: 'Write technical notes',
      description: 'Document something you learned today in a blog post, gist or README.',
    },
    portfolio: {
      title: 'Portfolio update',
      description: 'Add a project, case study or README to your portfolio.',
    },
    community: {
      title: 'Engage with the community',
      description: 'Answer a question, post a learning update, or join a discussion.',
    },
    design: {
      title: 'Design exercise',
      description: 'Sketch or prototype one screen, icon or component.',
    },
    career: {
      title: 'Career building block',
      description: 'Update your CV, LinkedIn, or practice a behavioural interview question.',
    },
  }

  const template = templates[category]

  return {
    id: `task:${date}:${category}:generic:${weekNumber}:${dayOfWeek}`,
    category,
    title: template.title,
    description: template.description,
    stackId: null,
    stackName: null,
    weekNumber,
    dayOfWeek,
    phase,
  }
}

export function generateDayPlan(date: string, startDate: string, selectedStackIds: string[]): DayPlan {
  const { weekNumber, dayOfWeek } = getWeekAndDay(startDate, date)
  const phase = getPhaseForWeek(weekNumber)
  const tasks: GeneratedTask[] = []

  const selectedStacks = selectedStackIds
    .map((id) => getStack(id))
    .filter((s): s is StackConfig => Boolean(s))

  for (const category of CATEGORIES) {
    const matchingStack = selectedStacks.find((s) => s.category === category)
    if (matchingStack) {
      tasks.push(buildStackTask(category, matchingStack, weekNumber, dayOfWeek, date))
    } else {
      const fallbackStack = selectedStacks[dayOfWeek % selectedStacks.length]
      if (category === 'coding' && fallbackStack) {
        tasks.push(buildStackTask(category, fallbackStack, weekNumber, dayOfWeek, date))
      } else {
        tasks.push(buildGenericTask(category, weekNumber, dayOfWeek, date))
      }
    }
  }

  return {
    date,
    weekNumber,
    dayOfWeek,
    phase,
    tasks,
  }
}

export function generateWeekPlan(weekNumber: number, startDate: string, selectedStackIds: string[]): WeekPlan {
  const { weekStart, weekEnd } = getWeekRange(startDate, weekNumber)
  const tasks: GeneratedTask[] = []

  for (let dayOfWeek = 0; dayOfWeek < DAYS_PER_WEEK; dayOfWeek++) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + dayOfWeek)
    const date = toISODate(d)
    const plan = generateDayPlan(date, startDate, selectedStackIds)
    tasks.push(...plan.tasks)
  }

  return {
    weekNumber,
    phase: getPhaseForWeek(weekNumber),
    weekStart,
    weekEnd,
    tasks,
  }
}

export function getCurrentWeekNumber(startDate: string): number {
  return getWeekAndDay(startDate, getTodayString()).weekNumber
}

function getTodayString(): string {
  return toISODate(new Date())
}
