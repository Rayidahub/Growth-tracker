'use client'

// components/ui/Toast.tsx
// Lightweight toast system — no external dependency beyond lucide-react.
// Usage: import { useToast } from '@/components/ui/Toast'

import { createContext, useCallback, useContext, useReducer, useRef } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

interface ToastState {
  toasts: Toast[]
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

// ─────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [...state.toasts.slice(-2), action.toast] } // max 3
    case 'REMOVE':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) }
  }
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
  toasts: Toast[]
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { toasts: [] })
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
    const t = timerMap.current.get(id)
    if (t) clearTimeout(t)
    timerMap.current.delete(id)
  }, [])

  const toast = useCallback(
    (opts: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      dispatch({ type: 'ADD', toast: { ...opts, id } })
      const duration = opts.variant === 'error' ? 6000 : 4000
      const timer = setTimeout(() => dismiss(id), duration)
      timerMap.current.set(id, timer)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts: state.toasts }}>
      {children}
      <ToastViewport toasts={state.toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

// ─────────────────────────────────────────────────────────────
// Viewport (renders toasts at bottom-right)
// ─────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; className: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
    className: 'border-emerald-500/30 bg-emerald-500/10',
  },
  error: {
    icon: <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
    className: 'border-red-500/30 bg-red-500/10',
  },
  info: {
    icon: <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />,
    className: 'border-indigo-500/30 bg-indigo-500/10',
  },
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[]
  dismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => {
        const { icon, className } = VARIANT_STYLES[t.variant]
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-2xl border p-4',
              'shadow-xl backdrop-blur-xl animate-fade-in',
              className
            )}
            role="alert"
          >
            {icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-slate-500 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
