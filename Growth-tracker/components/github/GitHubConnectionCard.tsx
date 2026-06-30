'use client'

// components/github/GitHubConnectionCard.tsx
// Shows connection status in Settings — connect, disconnect, last sync info.

import { useState, useEffect } from 'react'
import { Github, CheckCircle2, Loader2, RefreshCw, Unlink } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface GitHubConnectionCardProps {
  isConnected: boolean
  githubUsername: string | null
  lastSynced: string | null
  githubClientId: string
}

export function GitHubConnectionCard({
  isConnected: initialConnected,
  githubUsername: initialUsername,
  lastSynced,
  githubClientId,
}: GitHubConnectionCardProps) {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(initialConnected)
  const [githubUsername, setGithubUsername] = useState(initialUsername)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [connectUrl, setConnectUrl] = useState('#')

  useEffect(() => {
    if (githubClientId) {
      const url = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=read:user,repo&redirect_uri=${encodeURIComponent(window.location.origin + '/api/github/callback')}`
      setConnectUrl(url)
    }
  }, [githubClientId])

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub? Your existing activity data will be kept.')) return
    setIsDisconnecting(true)

    try {
      const res = await fetch('/api/github/disconnect', { method: 'DELETE' })
      if (res.ok) {
        setIsConnected(false)
        setGithubUsername(null)
        toast({ variant: 'success', title: 'GitHub disconnected' })
      } else {
        const d = await res.json()
        toast({ variant: 'error', title: 'Disconnect failed', description: d.error })
      }
    } catch {
      toast({ variant: 'error', title: 'Disconnect failed' })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast({
          variant: 'success',
          title: data.alreadySynced ? 'Already up to date' : `Synced ✓`,
          description: data.alreadySynced
            ? 'Synced within the last 15 minutes'
            : `${data.totalCommits} commits across ${data.repoCount} repos`,
        })
      } else {
        toast({ variant: 'error', title: 'Sync failed', description: data.error })
      }
    } catch {
      toast({ variant: 'error', title: 'Sync failed' })
    } finally {
      setIsSyncing(false)
    }
  }

  
  return (
    <div className={cn(
      'rounded-2xl border p-5 backdrop-blur-sm',
      isConnected
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-white/10 bg-white/5'
    )}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl ring-1',
            isConnected
              ? 'bg-gradient-to-br from-slate-700 to-slate-600 ring-white/10'
              : 'bg-white/5 ring-white/10'
          )}>
            <Github className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">GitHub</p>
            {isConnected && githubUsername ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Connected as @{githubUsername}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Not connected</p>
            )}
          </div>
        </div>

        {isConnected && (
          <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            Active
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Last synced</span>
              <span className="text-slate-300">{lastSynced ? new Date(lastSynced).toLocaleString() : 'Never'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Permissions</span>
              <span className="text-slate-300">read:user, repo</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Auto-sync</span>
              <span className="text-emerald-400">On page load + manual</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isSyncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Connect GitHub to automatically sync your daily commits, repositories, languages, and pull request activity into every daily log.
          </p>
          <a
            href={connectUrl}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 py-2.5 text-sm font-semibold text-white hover:from-slate-600 hover:to-slate-500 transition-all ring-1 ring-white/10"
          >
            <Github className="h-4 w-4" />
            Connect GitHub Account
          </a>
          <p className="text-[10px] text-slate-600 text-center">
            Requests read-only access to your public and private repo activity
          </p>
        </div>
      )}
    </div>
  )
}
