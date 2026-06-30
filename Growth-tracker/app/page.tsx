// app/page.tsx
// Root route — redirects to /dashboard (middleware handles auth check)
// If not authenticated, middleware redirects /dashboard → /login automatically.

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
