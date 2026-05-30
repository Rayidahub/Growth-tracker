// app/settings/page.tsx — Sprint 4 update (adds GitHub connection card)

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { GitHubConnectionCard } from '@/components/github/GitHubConnectionCard'
import { Settings } from 'lucide-react'

export const metadata: Metadata = { title: 'Settings — ProductivityOS' }

export default async function SettingsPage({ searchParams }: { searchParams: { github_connected?: string; github_error?: string } }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? ''

  return (
    <ToastProvider>
      <AppShell userEmail={user.email} userName={profile?.full_name} currentPhase={profile?.current_phase}>
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20">
              <Settings className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Settings</h1>
              <p className="text-xs text-slate-500">Manage your profile and integrations</p>
            </div>
          </div>

          {/* GitHub callback banners */}
          {searchParams.github_connected === 'true' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              ✓ GitHub connected successfully. Your commits will sync automatically.
            </div>
          )}
          {searchParams.github_error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              GitHub error: {decodeURIComponent(searchParams.github_error)}
            </div>
          )}

          {/* Account info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Account</p>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20 text-lg font-black text-indigo-400">
                {(profile?.full_name ?? user.email ?? 'U').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{profile?.full_name || '—'}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <p className="text-xs text-indigo-400 mt-0.5">{profile?.current_phase ?? 'Phase 1'}</p>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <SettingsForm userId={user.id} profile={profile} />

          {/* GitHub connection */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Integrations</p>
            <GitHubConnectionCard
              isConnected={profile?.github_connected ?? false}
              githubUsername={profile?.github_username ?? null}
              lastSynced={profile?.github_last_synced ?? null}
              githubClientId={githubClientId}
            />
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</p>
            <p className="text-xs text-slate-500 mb-4">Signing out clears your session. Your data stays safe in Supabase.</p>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all">
                Sign out of all devices
              </button>
            </form>
          </div>
        </div>
      </AppShell>
    </ToastProvider>
  )
}