'use client'

// app/offline/page.tsx
// Fallback page shown when the app is offline and a page is not cached.

import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  useEffect(() => {
    document.title = 'Offline — ProductivityOS'
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <WifiOff className="h-10 w-10 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white">You are offline</h1>
        <p className="text-slate-400">
          ProductivityOS needs an internet connection for some features. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Retry
        </button>
      </div>
    </main>
  )
}
