// app/log/page.tsx
// Protected page — full daily log form.
// Server Component fetches the user + today's log, passes to client form.

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DailyLogForm } from '@/components/daily-log/DailyLogForm'
import { ToastProvider } from '@/components/ui/Toast'
import Link from 'next/link'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Daily Log — ProductivityOS',
  description: 'Log your daily progress, scores, and reflections.',
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  // If a specific date is requested via ?date=YYYY-MM-DD, pre-load that log
  const requestedDate = searchParams.date
  let existingLog = null

  if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', requestedDate)
      .maybeSingle()
    existingLog = data
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0f1e]">
        {/* Ambient blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 top-20 h-72 w-72 rounded-full bg-indigo-900/30 blur-[100px]" />
          <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-violet-900/20 blur-[90px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {/* Top nav */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>ProductivityOS</span>
            </div>
          </div>

          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white">
              Daily{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Log
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Track every hour, commit, and breakthrough. Your score compounds.
            </p>
          </div>

          {/* Form */}
          <DailyLogForm
            userId={user.id}
            existingLog={existingLog}
            initialDate={requestedDate}
          />
        </div>
      </div>
    </ToastProvider>
  )
}
