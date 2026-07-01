// app/recap/page.tsx
// AI Weekly Recap page — server fetches existing recap + history,
// client components handle generation and display.

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import { RecapPageClient } from '@/components/recap/RecapPageClient'
import { getCurrentWeekStart, getCurrentWeekEnd, type WeeklyRecap } from '@/lib/recap/types'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI Weekly Recap — ProductivityOS',
}

export default async function RecapPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const weekStart = getCurrentWeekStart()
  const weekEnd   = getCurrentWeekEnd()

  const [profileResult, currentRecapResult, historyResult] = await Promise.all([
    supabase.from('profiles').select('full_name, current_phase, email').eq('id', user.id).single(),
    supabase.from('weekly_recaps').select('*').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle(),
    supabase.from('weekly_recaps')
      .select('id, week_start, week_end, recap_data, generated_at, tokens_used')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(12),
  ])

  const profile      = profileResult.data
  const currentRecap = currentRecapResult.data
  const history      = historyResult.data ?? []

  return (
    <ToastProvider>
      <AppShell
        userEmail={user.email}
        userName={profile?.full_name}
        currentPhase={profile?.current_phase}
      >
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20">
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">
                AI Weekly{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  Recap
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Claude analyses your week and delivers coaching you can act on
              </p>
            </div>
          </div>

          {/* Client handles all interactivity */}
          <RecapPageClient
            currentRecap={currentRecap as unknown as WeeklyRecap | null}
            history={history as unknown as WeeklyRecap[]}
            weekStart={weekStart}
            weekEnd={weekEnd}
          />

        </div>
      </AppShell>
    </ToastProvider>
  )
}
