'use client'

// components/layout/AppShell.tsx — Sprint 5 update (adds Recap to nav)

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, BarChart3, History,
  Settings, LogOut, Zap, Menu, X, ChevronRight, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  userEmail?: string
  userName?: string
  currentPhase?: string
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log',       label: 'Daily Log',  icon: BookOpen        },
  { href: '/analytics', label: 'Analytics',  icon: BarChart3       },
  { href: '/recap',     label: 'AI Recap',   icon: Sparkles        },
  { href: '/history',   label: 'History',    icon: History         },
  { href: '/settings',  label: 'Settings',   icon: Settings        },
]

export function AppShell({ children, userEmail, userName, currentPhase }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-900/25 blur-[120px]" />
        <div className="absolute right-0 top-1/2 h-72 w-72 rounded-full bg-violet-900/15 blur-[100px]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:left-0 z-20 border-r border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30 flex-shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">ProductivityOS</p>
            <p className="text-xs text-indigo-400 truncate">{currentPhase ?? 'Phase 1'}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-500/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}>
                <Icon className={cn('h-4 w-4 flex-shrink-0', active && 'text-indigo-400')} />
                {label}
                {label === 'AI Recap' && (
                  <span className="ml-auto rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400 ring-1 ring-indigo-500/20">AI</span>
                )}
                {active && label !== 'AI Recap' && <ChevronRight className="ml-auto h-3.5 w-3.5 text-indigo-400/60" />}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/5 space-y-1">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-white truncate">{userName || 'Engineer'}</p>
            <p className="text-xs text-slate-600 truncate">{userEmail}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all">
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">ProductivityOS</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 border-r border-white/10 bg-[#0c1124] flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">ProductivityOS</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  pathname === href ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-500/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}>
                  <Icon className="h-4 w-4 flex-shrink-0" />{label}
                  {label === 'AI Recap' && <span className="ml-auto rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">AI</span>}
                </Link>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-white/5">
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all">
                  <LogOut className="h-4 w-4" />Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-56 relative z-10 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
