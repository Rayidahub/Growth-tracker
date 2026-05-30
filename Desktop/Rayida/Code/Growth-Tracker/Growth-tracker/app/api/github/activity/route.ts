// app/api/github/activity/route.ts
// GET — returns the stored GitHub activity for a given date.
// Called by GitHubActivityPanel after a sync to refresh the UI.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('github_activity')
    .select('*')
    .eq('user_id', user.id)
    .eq('activity_date', date)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ activity: data })
}