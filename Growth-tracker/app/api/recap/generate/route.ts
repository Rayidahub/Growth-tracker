// app/api/recap/generate/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRecapPrompt } from '@/lib/recap/buildPrompt'
import {
  getCurrentWeekStart, getCurrentWeekEnd,
  getPrevWeekStart, getPrevWeekEnd,
} from '@/lib/recap/types'
import type { RecapData } from '@/lib/recap/types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Allow custom week_start override from request body ────
  let weekStart = getCurrentWeekStart()
  let weekEnd   = getCurrentWeekEnd()
  let prevStart = getPrevWeekStart()
  let prevEnd   = getPrevWeekEnd()

  try {
    const body = await request.json()
    if (body?.week_start) {
      weekStart = body.week_start
      const d = new Date(weekStart + 'T00:00:00')
      d.setDate(d.getDate() + 6)
      weekEnd = d.toISOString().slice(0, 10)
      const pd = new Date(weekStart + 'T00:00:00')
      pd.setDate(pd.getDate() - 7)
      prevStart = pd.toISOString().slice(0, 10)
      pd.setDate(pd.getDate() + 6)
      prevEnd = pd.toISOString().slice(0, 10)
    }
  } catch { /* no body — use defaults */ }

  // ── Fetch logs ────────────────────────────────────────────
  const [profileResult, thisWeekResult, prevWeekResult] = await Promise.all([
    supabase.from('profiles').select('full_name, current_phase').eq('id', user.id).single(),
    supabase.from('daily_logs').select('*').eq('user_id', user.id)
      .gte('log_date', weekStart).lte('log_date', weekEnd)
      .order('log_date', { ascending: true }),
    supabase.from('daily_logs').select('*').eq('user_id', user.id)
      .gte('log_date', prevStart).lte('log_date', prevEnd)
      .order('log_date', { ascending: true }),
  ])

  const profile    = profileResult.data
  const thisLogs   = thisWeekResult.data  ?? []
  const prevLogs   = prevWeekResult.data  ?? []

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (thisLogs.length === 0 && prevLogs.length === 0) {
    return NextResponse.json(
      { error: 'No logs found for this week or last week. Start logging first!' },
      { status: 400 }
    )
  }

  // ── Build prompt ──────────────────────────────────────────
  const prompt = buildRecapPrompt(thisLogs, prevLogs, profile)

  // ── Call Groq API (FREE!) ─────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    console.error('[Recap] Missing GROQ_API_KEY')
    return NextResponse.json(
      { error: 'GROQ_API_KEY not configured on server.' },
      { status: 500 }
    )
  }

  // Using Llama 3.3 70B - great quality for free
  const model = 'llama-3.3-70b-versatile'
  
  console.log('[Recap] Calling Groq API with model:', model)
  console.log('[Recap] Prompt length:', prompt.length)

  // System prompt to guide Groq's response format
  const systemPrompt = `You are an engineering growth recap generator. You MUST respond with valid JSON only, no markdown formatting or extra text. The JSON must follow this exact structure:

{
  "intro": "string - engaging week summary",
  "wins": [{"title": "string", "detail": "string"}],
  "gaps": [{"area": "string", "observation": "string", "suggestion": "string"}],
  "actionItems": [{"action": "string", "priority": "high|medium|low", "pillar": "string"}],
  "pillarComparisons": [{"label": "string", "thisWeek": number, "lastWeek": number, "max": 100, "trend": "up|down|flat"}],
  "weekSummary": {
    "thisWeekAvg": number,
    "lastWeekAvg": number,
    "totalHours": number,
    "totalCommits": number,
    "logCount": number
  },
  "nextWeekFocus": "string"
}`

  let groqResponse: Response
  try {
    groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    })
  } catch (_err: unknown) {
    console.error('[Recap] Network error calling Groq:', _err)
    return NextResponse.json(
      { error: `Failed to reach Groq API: ${(_err as Error).message}` },
      { status: 502 }
    )
  }

  if (!groqResponse.ok) {
    const errBody = await groqResponse.text()
    console.error('[Recap] Groq API error:', groqResponse.status, errBody)
    
    // Provide more specific error messages
    if (groqResponse.status === 401) {
      return NextResponse.json(
        { error: 'Invalid Groq API key' },
        { status: 500 }
      )
    }
    if (groqResponse.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: `Groq API error: ${errBody.slice(0, 200)}` },
      { status: 502 }
    )
  }

  let groqData
  try {
    groqData = await groqResponse.json()
  } catch (_err) {
    console.error('[Recap] Failed to parse Groq response', _err)
    return NextResponse.json(
      { error: 'Invalid response from Groq API' },
      { status: 502 }
    )
  }
  
  const rawText: string = groqData?.choices?.[0]?.message?.content ?? ''
  const tokensUsed = groqData?.usage?.total_tokens || 0

  if (!rawText) {
    console.error('[Recap] Empty response from Groq')
    return NextResponse.json(
      { error: 'No response from Groq. Please try again.' },
      { status: 500 }
    )
  }

  console.log('[Recap] Raw Groq response preview:', rawText.slice(0, 200))

  // ── Parse JSON from Groq ────────────────────────────────
  let recapData: RecapData
  try {
    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    recapData = JSON.parse(cleaned)
  } catch (_err) {
    console.error('[Recap] JSON parse failed. Raw:', rawText.slice(0, 500), _err)
    return NextResponse.json(
      { error: 'Groq returned malformed JSON. Please try again.' },
      { status: 500 }
    )
  }

  // ── Validate required fields ──────────────────────────────
  if (!recapData.intro || !Array.isArray(recapData.wins) || !Array.isArray(recapData.actionItems)) {
    console.error('[Recap] Missing required fields:', Object.keys(recapData))
    return NextResponse.json(
      { error: 'Incomplete recap data from Groq. Please try again.' },
      { status: 500 }
    )
  }

  // ── Build recap_text (markdown for copy/export) ───────────
  const recapText = buildRecapMarkdown(recapData, weekStart, weekEnd, profile.full_name)

  // ── Persist to Supabase ───────────────────────────────────
  try {
    const { data: saved, error: saveError } = await supabase
      .from('weekly_recaps')
      .upsert({
        user_id:             user.id,
        week_start:          weekStart,
        week_end:            weekEnd,
        logs_snapshot:       thisLogs  as unknown,
        prev_logs_snapshot:  prevLogs  as unknown,
        recap_data:          recapData as unknown,
        recap_text:          recapText,
        model_used:          model,
        tokens_used:         tokensUsed,
        generated_at:        new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })
      .select()
      .single()

    if (saveError) {
      console.error('[Recap] Supabase save error:', saveError.message)
      // Still return the recap even if save fails
      return NextResponse.json({ 
        recap: recapData, 
        recapText, 
        saved: false, 
        tokensUsed,
        warning: 'Recap generated but not saved to database'
      })
    }

    return NextResponse.json({
      recap: recapData,
      recapText,
      recapId: saved.id,
      saved: true,
      tokensUsed,
      weekStart,
      weekEnd,
    })
  } catch (saveError: unknown) {
    console.error('[Recap] Save error:', saveError)
    return NextResponse.json({ 
      recap: recapData, 
      recapText, 
      saved: false, 
      tokensUsed,
      warning: 'Recap generated but failed to save'
    })
  }
}

// ─────────────────────────────────────────────────────────────
// Build markdown text from structured recap
// ─────────────────────────────────────────────────────────────

function buildRecapMarkdown(
  recap: RecapData,
  weekStart: string,
  weekEnd: string,
  name?: string
): string {
  const lines: string[] = [
    `# Weekly Recap — ${weekStart} to ${weekEnd}`,
    name ? `**Engineer:** ${name}` : '',
    '',
    recap.intro,
    '',
    '## 🏆 Wins',
    ...recap.wins.map((w) => `**${w.title}**\n${w.detail}`),
    '',
    '## 🔍 Gaps',
    ...(recap.gaps?.length
      ? recap.gaps.map((g) => `**${g.area}**: ${g.observation}\n→ *${g.suggestion}*`)
      : ['No significant gaps this week.']),
    '',
    '## ✅ Action Items',
    ...(recap.actionItems?.map((a, i) =>
      `${i + 1}. [${a.priority.toUpperCase()}] ${a.action} *(${a.pillar})*`
    ) || []),
    '',
    '## 📊 Score Comparison',
    ...(recap.pillarComparisons?.map((p) => {
      const arrow = p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'
      return `- **${p.label}**: ${p.thisWeek}/${p.max} ${arrow} (was ${p.lastWeek})`
    }) || []),
    '',
    `**Weekly avg:** ${recap.weekSummary?.thisWeekAvg || 0}/100 (prev: ${recap.weekSummary?.lastWeekAvg || 0}/100)`,
    `**Deep work:** ${recap.weekSummary?.totalHours || 0}h | **Commits:** ${recap.weekSummary?.totalCommits || 0} | **Logs:** ${recap.weekSummary?.logCount || 0}/7`,
    '',
    `## 🎯 Next Week Focus`,
    recap.nextWeekFocus || 'Continue building momentum!',
  ]

  return lines.filter((l) => l !== undefined && l !== '').join('\n')
}