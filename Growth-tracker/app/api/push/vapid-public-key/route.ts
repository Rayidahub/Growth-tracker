// app/api/push/vapid-public-key/route.ts

import { NextResponse } from 'next/server'
import { getVapidPublicKey, isPushConfigured } from '@/lib/push/web-push'

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey: getVapidPublicKey() })
}
