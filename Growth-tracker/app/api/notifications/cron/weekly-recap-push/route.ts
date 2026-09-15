// app/api/notifications/cron/weekly-recap-push/route.ts
// Sends a push notification when the weekly recap is ready.
// Run after /api/recap/generate or on a schedule (e.g., Monday mornings).
// Call with Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushNotification, isPushConfigured } from '@/lib/push/web-push'
import { getCurrentWeekStart } from '@/lib/recap/types'

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  }

  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const weekStart = getCurrentWeekStart()

  // Find users with weekly recap push enabled who have a recap for this week
  const { data: recaps, error } = await supabase
    .from('weekly_recaps')
    .select('id, user_id, week_start')
    .eq('week_start', weekStart)

  if (error) {
    console.error('[cron/weekly-recap-push] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const recap of recaps ?? []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, push_notifications_enabled, weekly_recap_push_enabled')
      .eq('id', recap.user_id)
      .single()

    if (!profile?.push_notifications_enabled || !profile?.weekly_recap_push_enabled) continue

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', recap.user_id)

    for (const sub of subscriptions ?? []) {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: 'Your weekly recap is ready',
            body: `Hey ${profile.full_name || 'there'} — review your ${weekStart} week recap.`,
            icon: '/icon-192x192.png',
            url: '/recap',
          }
        )
        sent++
      } catch (err) {
        failed++
        console.error(`[cron/weekly-recap-push] failed for ${recap.user_id}:`, err)
      }
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: (recaps ?? []).length })
}
