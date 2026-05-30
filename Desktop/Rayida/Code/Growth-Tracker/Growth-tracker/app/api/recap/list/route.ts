// app/api/recap/list/route.ts
// GET — returns the user's past recaps (id, week_start, week_end, avg score, generated_at)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('weekly_recaps')
    .select('id, week_start, week_end, recap_data, generated_at, tokens_used')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recaps: data ?? [] })
}
