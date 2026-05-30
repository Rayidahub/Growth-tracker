// components/auth/AuthLayout.tsx
// Wraps the login/signup pages with the full-screen gradient background,
// decorative elements, and the marketing copy panel.

import { type ReactNode } from 'react'
import { Code2, LineChart, Brain, Trophy } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
}

const FEATURES = [
  {
    icon: Code2,
    title: 'Daily Coding Logs',
    description: 'Track deep work hours, commits, and breakthroughs every day.',
  },
  {
    icon: LineChart,
    title: 'Score-Based Progress',
    description: 'Seven pillars. 100 points. Know exactly where you stand.',
  },
  {
    icon: Brain,
    title: 'AI-Aware Workflow',
    description: 'Log which AI tools you used and how they amplified your output.',
  },
  {
    icon: Trophy,
    title: 'Phase Milestones',
    description: 'Advance through phases as you master each engineering domain.',
  },
]

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#0a0f1e]">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-900/40 blur-[120px]" />
        <div className="absolute -right-20 top-1/4 h-80 w-80 rounded-full bg-violet-900/30 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-800/20 blur-[90px]" />
      </div>

      {/* Grid dot pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #818cf8 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative flex min-h-screen">
        {/* ── Left: Marketing panel (hidden on mobile) ─────────────── */}
        <div className="hidden lg:flex lg:w-[45%] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          {/* Brand */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]" />
              <span className="text-xs font-medium text-slate-300">Sprint 1 — Foundation</span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white xl:text-5xl">
                Engineer your{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  growth
                </span>
                ,{' '}
                <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                  daily.
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-slate-400">
                A personal productivity OS built for AI-aware engineers. Track every hour,
                every commit, every breakthrough — and watch your scores compound over time.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/20">
                    <Icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs leading-relaxed text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p className="text-xs text-slate-600">
            Built for personal use · Powered by Supabase + Next.js 14
          </p>
        </div>

        {/* ── Right: Auth form ──────────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:border-l lg:border-white/5 lg:px-12 xl:px-16">
          {children}
        </div>
      </div>
    </div>
  )
}
