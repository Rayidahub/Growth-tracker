// app/roadmap/page.tsx
// Weekly roadmap view for the user's selected learning stacks.

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { RoadmapWeekView } from '@/components/roadmap/RoadmapWeekView'
import { getCurrentWeekNumber } from '@/lib/roadmap/generator'
import { Map } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Roadmap — ProductivityOS',
}

export default async function RoadmapPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_phase, start_date, learning_stacks')
    .eq('id', user.id)
    .single()

  const startDate = profile?.start_date ?? new Date().toISOString().slice(0, 10)
  const selectedStacks = profile?.learning_stacks ?? []
  const currentWeek = getCurrentWeekNumber(startDate)

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-20 h-96 w-96 rounded-full bg-indigo-900/30 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-violet-900/20 blur-[100px]" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Map className="h-6 w-6 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">96-Week Roadmap</h1>
            <p className="text-sm text-slate-400">
              Personalised from your selected stacks · {profile?.current_phase ?? 'Phase 1'}
            </p>
          </div>
        </div>

        <RoadmapWeekView
          userId={user.id}
          startDate={startDate}
          selectedStacks={selectedStacks}
          initialWeek={currentWeek}
        />
      </main>
    </div>
  )
}
