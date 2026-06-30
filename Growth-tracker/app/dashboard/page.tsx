// app/dashboard/page.tsx
// Main dashboard — Server Component that fetches user data, recent logs,
// and passes to client components. Includes QuickCheckin at top.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { QuickCheckin } from '@/components/daily-log/QuickCheckin'
import { LogStreak } from '@/components/daily-log/LogStreak'
import { RecentLogs } from '@/components/daily-log/RecentLogs'
import { ToastProvider } from '@/components/ui/Toast'
import {
  Zap, LogOut, Settings, BookOpen, TrendingUp,
  Code2, Award, CalendarDays,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard — ProductivityOS',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Parallel fetches
  const [profileResult, logsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, current_phase, start_date, github_username')
      .eq('id', user.id)
      .single(),
    supabase
      .from('daily_logs')
      .select('id, log_date, total_score, deep_work_hours, github_commits')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(14),
  ])

  const profile = profileResult.data
  const logs = logsResult.data ?? []

  // Compute aggregate stats
  const totalLogs = logs.length
  const avgScore =
    totalLogs > 0 ? Math.round(logs.reduce((s, l) => s + l.total_score, 0) / totalLogs) : 0
  const totalHours = logs.reduce((s, l) => s + l.deep_work_hours, 0)
  const totalCommits = logs.reduce((s, l) => s + l.github_commits, 0)

  // Days since start
  const startDate = profile?.start_date ? new Date(profile.start_date + 'T00:00:00') : new Date()
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0f1e]">
        {/* Ambient blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-20 h-96 w-96 rounded-full bg-indigo-900/30 blur-[120px]" />
          <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-violet-900/20 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-indigo-800/15 blur-[80px]" />
        </div>

        {/* Nav */}
        <header className="relative border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">ProductivityOS</span>
              <span className="hidden sm:inline rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20">
                {profile?.current_phase ?? 'Phase 1'}
              </span>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              <Link
                href="/log"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
              >
                <BookOpen className="h-3.5 w-3.5" /> Full Log
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

          {/* Greeting */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-6 backdrop-blur-sm">
            <p className="text-sm text-indigo-300 mb-1">{greeting} 👋</p>
            <h1 className="text-2xl font-black text-white">
              {profile?.full_name || user.email?.split('@')[0]}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Day <span className="font-semibold text-white">{daysSinceStart}</span> of your engineering journey
              {profile?.github_username && (
                <span className="ml-3 text-slate-500">
                  · @{profile.github_username}
                </span>
              )}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: <TrendingUp className="h-4 w-4" />,
                label: 'Avg Score',
                value: avgScore,
                suffix: '/100',
                color: 'text-indigo-400',
                gradient: 'from-indigo-500/20 to-violet-500/10',
                ring: 'ring-indigo-500/20',
              },
              {
                icon: <CalendarDays className="h-4 w-4" />,
                label: 'Logs Filed',
                value: totalLogs,
                suffix: 'entries',
                color: 'text-violet-400',
                gradient: 'from-violet-500/20 to-pink-500/10',
                ring: 'ring-violet-500/20',
              },
              {
                icon: <Code2 className="h-4 w-4" />,
                label: 'Focus Hours',
                value: totalHours.toFixed(1),
                suffix: 'hrs',
                color: 'text-emerald-400',
                gradient: 'from-emerald-500/20 to-teal-500/10',
                ring: 'ring-emerald-500/20',
              },
              {
                icon: <Award className="h-4 w-4" />,
                label: 'Commits',
                value: totalCommits,
                suffix: 'total',
                color: 'text-amber-400',
                gradient: 'from-amber-500/20 to-orange-500/10',
                ring: 'ring-amber-500/20',
              },
            ].map(({ icon, label, value, suffix, color, gradient, ring }) => (
              <div
                key={label}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-4 backdrop-blur-sm ring-1 ${ring}`}
              >
                <div className={`mb-2 ${color}`}>{icon}</div>
                <div className={`text-xl font-black tabular-nums ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label} · {suffix}</div>
              </div>
            ))}
          </div>

          {/* Two-column grid on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left column */}
            <div className="space-y-5">
              {/* Quick check-in */}
              <QuickCheckin userId={user.id} />

              {/* Streak calendar */}
              <LogStreak logs={logs} />
            </div>

            {/* Right column — Recent logs */}
            <RecentLogs logs={logs} />
          </div>

          {/* Full log CTA */}
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
            <p className="text-sm text-slate-500 mb-3">
              Want to log your full day with reflections, AI tools, and detailed scores?
            </p>
            <Link
              href="/log"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Open Full Daily Log
            </Link>
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
