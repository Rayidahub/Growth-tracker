// app/api/github/disconnect/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      github_connected: false,
      github_username: null,
      github_access_token: null,
      github_last_synced: null,
    })
    .eq('id', user.id)
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}