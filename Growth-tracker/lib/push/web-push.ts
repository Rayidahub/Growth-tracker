// lib/push/web-push.ts
// Web Push helpers using the web-push library.

import webpush from 'web-push'

const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? ''

export function isPushConfigured() {
  return Boolean(vapidPublicKey && vapidPrivateKey)
}

export function configureVapid() {
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys are not configured')
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export function getVapidPublicKey() {
  return vapidPublicKey
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; icon?: string; url?: string }
) {
  if (!isPushConfigured()) {
    throw new Error('Push notifications are not configured')
  }
  configureVapid()
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}
