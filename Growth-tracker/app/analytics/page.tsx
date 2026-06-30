// app/analytics/page.tsx
// Full analytics dashboard — server-fetches all logs, computes stats,
// renders chart components. Uses the AppShell sidebar layout.

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import { ScoreTrendChart } from '@/components/analytics/ScoreTrendChart'
import { PillarBreakdown } from '@/components/analytics/PillarBreakdown'
import { WeeklyBarChart } from '@/components/analytics/WeeklyBarChart'
import { HeatmapCalendar } from '@/components/analytics/HeatmapCalendar'
import { PhaseProgressCard } from '@/components/analytics/PhaseProgressCard'
import { StatsSummaryRow } from '@/components/analytics/StatsSummaryRow'
import {
  computeOverallStats,
  computeDailyPoints,
  computeWeeklyBuckets,
  computePillarStats,
  computePhaseProgress,
  computeHeatmapData,
} from '@/lib/analytics/computeStats'
import { BarChart3 } from 'lucide-react'
import { AnalyticsControls } from '@/components/analytics/AnalyticsControls'

export const metadata: Metadata = {
  title: 'Analytics — ProductivityOS',
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const range = Number(searchParams.range ?? 30)
  const validRange = [7, 14, 30, 90, 365].includes(range) ? range : 30

  const [profileResult, logsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, current_phase, start_date, email')
      .eq('id', user.id)
      .single(),
    supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(365),
  ])

  const profile = profileResult.data
  const allLogs = logsResult.data ?? []

  // Compute all stats
  const overallStats = computeOverallStats(allLogs, profile?.start_date ?? new Date().toISOString().slice(0, 10))
  const dailyPoints  = computeDailyPoints(allLogs, validRange)
  const weeklyData   = computeWeeklyBuckets(allLogs, Math.ceil(validRange / 7))
  const pillarStats  = computePillarStats(allLogs)
  const phaseData    = computePhaseProgress(allLogs, profile?.current_phase ?? 'Phase 1', profile?.start_date ?? '')
  const heatmapDays  = computeHeatmapData(allLogs)

  return (
    <ToastProvider>
      <AppShell
        userEmail={user.email}
        userName={profile?.full_name}
        currentPhase={profile?.current_phase}
      >
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                </div>
                <h1 className="text-xl font-black text-white">Analytics</h1>
              </div>
              <p className="text-sm text-slate-400">
                {allLogs.length} logs · {overallStats.totalDeepWorkHours}h total focus
              </p>
            </div>
            <AnalyticsControls currentRange={validRange} />
          </div>

          {/* Stats summary */}
          <StatsSummaryRow stats={overallStats} />

          {/* Score trend + phase side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-white">Score Trend</p>
                <p className="text-xs text-slate-500">Last {validRange} days</p>
              </div>
              <ScoreTrendChart data={dailyPoints} height={200} showCommits />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-2 px-1">Phase Progress</p>
              <PhaseProgressCard phase={phaseData} />
            </div>
          </div>

          {/* Weekly bars — 3 metrics */}
          <div>
            <p className="text-sm font-semibold text-white mb-3 px-1">Weekly Breakdown</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1.5 px-1">Avg Score / Week</p>
                <WeeklyBarChart data={weeklyData} metric="avgScore" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5 px-1">Focus Hours / Week</p>
                <WeeklyBarChart data={weeklyData} metric="totalHours" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5 px-1">Commits / Week</p>
                <WeeklyBarChart data={weeklyData} metric="totalCommits" />
              </div>
            </div>
          </div>

          {/* Pillar breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-semibold text-white">Score Pillars</p>
              <p className="text-xs text-slate-500">Avg · Best · Trend vs last 7 days</p>
            </div>
            <PillarBreakdown pillars={pillarStats} />
          </div>

          {/* Heatmap */}
          <HeatmapCalendar days={heatmapDays} />

        </div>
      </AppShell>
    </ToastProvider>
  )
}