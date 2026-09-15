// app/api/notifications/cron/daily-push-reminders/route.ts
// Sends daily log reminder push notifications to opted-in users.
// Run hourly from your scheduler. Call with Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPushNotification, isPushConfigured } from '@/lib/push/web-push'

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  }

  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const now = new Date()
  const currentHour = String(now.getUTCHours()).padStart(2, '0') + ':00'
  const today = now.toISOString().slice(0, 10)

  // Find users who want daily push reminders at this hour
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, full_name, reminder_time')
    .eq('push_notifications_enabled', true)
    .eq('daily_reminder_enabled', true)
    .eq('reminder_time', currentHour)

  if (error) {
    console.error('[cron/daily-push-reminders] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const user of users ?? []) {
    // Skip if user already logged today
    const { data: todayLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle()

    if (todayLog) continue

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id)

    for (const sub of subscriptions ?? []) {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: 'Time to log your day',
            body: `Hey ${user.full_name || 'there'} — don't forget to log today's progress.`,
            icon: '/icon-192x192.png',
            url: '/log',
          }
        )
        sent++
      } catch (err) {
        failed++
        console.error(`[cron/daily-push-reminders] failed for ${user.id}:`, err)
      }
    }
  }

  return NextResponse.json({ success: true, sent, failed, total: (users ?? []).length })
}
