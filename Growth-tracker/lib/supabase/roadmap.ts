// lib/supabase/roadmap.ts
// CRUD for learning stack preferences and task completions.

import { createClient } from '@/lib/supabase/client'

export async function getLearningStacks(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('learning_stacks')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[getLearningStacks]', error)
    return []
  }
  return data?.learning_stacks ?? []
}

export async function updateLearningStacks(userId: string, stacks: string[]) {
  const supabase = createClient()
  return supabase.from('profiles').update({ learning_stacks: stacks }).eq('id', userId)
}

export async function getTaskCompletions(userId: string, taskDate: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('task_completions')
    .select('task_id')
    .eq('user_id', userId)
    .eq('task_date', taskDate)

  if (error) {
    console.error('[getTaskCompletions]', error)
    return new Set<string>()
  }
  return new Set((data ?? []).map((r) => r.task_id))
}

export async function completeTask(userId: string, taskId: string, taskDate: string) {
  const supabase = createClient()
  return supabase.from('task_completions').upsert(
    { user_id: userId, task_id: taskId, task_date: taskDate },
    { onConflict: 'user_id,task_id' }
  )
}

export async function uncompleteTask(userId: string, taskId: string) {
  const supabase = createClient()
  return supabase.from('task_completions').delete().eq('user_id', userId).eq('task_id', taskId)
}

export async function completeTasks(userId: string, taskIds: string[], taskDate: string) {
  const supabase = createClient()
  const rows = taskIds.map((taskId) => ({ user_id: userId, task_id: taskId, task_date: taskDate }))
  return supabase.from('task_completions').upsert(rows, { onConflict: 'user_id,task_id' })
}
