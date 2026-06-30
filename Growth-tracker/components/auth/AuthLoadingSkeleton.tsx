// components/auth/AuthLoadingSkeleton.tsx
// Shown while the auth form suspends (e.g., reading searchParams)

export function AuthLoadingSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
      {/* Logo row */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-white/10" />
        <div className="h-4 w-28 rounded-md bg-white/10" />
      </div>

      {/* Title */}
      <div className="mb-2 h-7 w-44 rounded-md bg-white/10" />
      {/* Subtitle */}
      <div className="mb-8 h-4 w-64 rounded-md bg-white/5" />

      {/* Google button */}
      <div className="mb-5 h-11 w-full rounded-xl bg-white/10" />

      {/* Divider */}
      <div className="mb-5 h-4 w-full rounded bg-white/5" />

      {/* Input fields */}
      <div className="space-y-4">
        <div className="h-11 w-full rounded-xl bg-white/10" />
        <div className="h-11 w-full rounded-xl bg-white/10" />
      </div>

      {/* Submit button */}
      <div className="mt-5 h-11 w-full rounded-xl bg-indigo-500/30" />
    </div>
  )
}
