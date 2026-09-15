// app/api/push/send/route.ts
// Sends a test push notification to the authenticated user.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification, isPushConfigured } from '@/lib/push/web-push'

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const payload = {
    title: body.title ?? 'ProductivityOS',
    body: body.body ?? 'This is a test push notification.',
    icon: '/icon-192x192.png',
    url: '/dashboard',
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (error) {
    console.error('[push/send]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ error: 'No push subscriptions found' }, { status: 404 })
  }

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err) {
      failed++
      console.error('[push/send] failed for endpoint:', sub.endpoint, err)
    }
  }

  return NextResponse.json({ success: true, sent, failed })
}
