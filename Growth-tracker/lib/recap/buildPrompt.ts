// lib/recap/buildPrompt.ts
// Constructs the Claude prompt from this week's + last week's daily logs.
// Kept separate so it's easy to iterate on the prompt without touching API logic.

import type { DailyLog } from '@/types/database'
import { SCORE_CONFIG, TOTAL_MAX } from '@/lib/validations/dailyLog'

export function buildRecapPrompt(
  thisWeekLogs: DailyLog[],
  prevWeekLogs: DailyLog[],
  profile: { full_name?: string; current_phase?: string }
): string {
  const name = profile.full_name?.split(' ')[0] ?? 'the engineer'
  const phase = profile.current_phase ?? 'Phase 1'

  function summariseLogs(logs: DailyLog[]): string {
    if (logs.length === 0) return 'No logs recorded this week.'

    const avgScore = Math.round(logs.reduce((s, l) => s + l.total_score, 0) / logs.length)
    const totalHours = logs.reduce((s, l) => s + l.deep_work_hours, 0).toFixed(1)
    const totalCommits = logs.reduce((s, l) => s + l.github_commits, 0)
    const docDays = logs.filter((l) => l.public_documentation_done).length

    const pillarAvgs = SCORE_CONFIG.map(({ key, label, max }) => {
      const avg = logs.reduce((s, l) => s + ((l[key as keyof DailyLog] as number) ?? 0), 0) / logs.length
      return `  ${label}: ${avg.toFixed(1)}/${max} (${Math.round((avg / max) * 100)}%)`
    })

    const allAiTools = logs.flatMap((l) => l.ai_tools_used ?? [])
    const toolFreq = allAiTools.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1; return acc
    }, {})
    const topTools = Object.entries(toolFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t).join(', ')

    const learnings = logs.map((l) => l.biggest_learning).filter(Boolean).slice(0, 3)
    const challenges = logs.map((l) => l.biggest_challenge).filter(Boolean).slice(0, 3)
    const bugs = logs.map((l) => l.bug_solved).filter(Boolean).slice(0, 2)

    const frontendTopics = [...new Set(logs.flatMap((l) => l.frontend_topics ?? []))].slice(0, 5)
    const designPractice = [...new Set(logs.flatMap((l) => l.product_design_practice ?? []))].slice(0, 5)

    return [
      `Logs filed: ${logs.length}/7`,
      `Avg total score: ${avgScore}/${TOTAL_MAX}`,
      `Total deep work: ${totalHours}h`,
      `Total commits: ${totalCommits}`,
      `Public docs done: ${docDays} day(s)`,
      `Top AI tools: ${topTools || 'none recorded'}`,
      '',
      'Score breakdown (avg per pillar):',
      ...pillarAvgs,
      '',
      frontendTopics.length ? `Frontend topics: ${frontendTopics.join(', ')}` : '',
      designPractice.length ? `Design practice: ${designPractice.join(', ')}` : '',
      '',
      learnings.length ? `Key learnings:\n${learnings.map((l) => `  - ${l}`).join('\n')}` : '',
      challenges.length ? `Challenges faced:\n${challenges.map((c) => `  - ${c}`).join('\n')}` : '',
      bugs.length ? `Bugs solved:\n${bugs.map((b) => `  - ${b}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
  }

  const thisWeekSummary = summariseLogs(thisWeekLogs)
  const prevWeekSummary = summariseLogs(prevWeekLogs)

  return `You are a world-class engineering productivity coach analysing a developer's weekly progress data. Your role is to provide honest, specific, actionable feedback — like a senior mentor who genuinely wants this person to level up.

ENGINEER: ${name}
CURRENT PHASE: ${phase}
SCORE SYSTEM: 100 points total across 7 pillars (Coding/25, Product/15, Docs/15, Brand/10, Portfolio/15, Discipline/10, Health/10)

---
THIS WEEK'S DATA:
${thisWeekSummary}

---
PREVIOUS WEEK'S DATA (for comparison):
${prevWeekSummary}

---
INSTRUCTIONS:
Generate a weekly recap in this EXACT JSON structure. Do not wrap in markdown code blocks. Return only valid JSON.

{
  "intro": "2-3 sentences. Conversational, coaching tone. Reference specific numbers from the data. Acknowledge effort genuinely without being sycophantic.",
  
  "wins": [
    {
      "title": "Short win headline (5-8 words)",
      "detail": "1-2 sentences explaining WHY this is a win, with specific data points."
    }
  ],
  
  "gaps": [
    {
      "area": "Specific pillar or habit name",
      "observation": "What the data shows — be direct and specific.",
      "suggestion": "One concrete, actionable thing to change next week."
    }
  ],
  
  "actionItems": [
    {
      "priority": "high|medium|low",
      "action": "Specific action starting with a verb. E.g. 'Block 2h deep work before opening Slack'",
      "pillar": "Which score pillar this most affects"
    }
  ],
  
  "pillarComparisons": [
    ${SCORE_CONFIG.map(({ key, label, max }) => {
      const tw = thisWeekLogs.length
        ? (thisWeekLogs.reduce((s, l) => s + ((l[key as keyof DailyLog] as number) ?? 0), 0) / thisWeekLogs.length)
        : 0
      const pw = prevWeekLogs.length
        ? (prevWeekLogs.reduce((s, l) => s + ((l[key as keyof DailyLog] as number) ?? 0), 0) / prevWeekLogs.length)
        : 0
      return `{"key":"${key}","label":"${label}","thisWeek":${tw.toFixed(1)},"lastWeek":${pw.toFixed(1)},"change":${(tw - pw).toFixed(1)},"trend":"${tw > pw + 0.3 ? 'up' : tw < pw - 0.3 ? 'down' : 'flat'}","max":${max}}`
    }).join(',\n    ')}
  ],
  
  "weekSummary": {
    "thisWeekAvg": ${thisWeekLogs.length ? Math.round(thisWeekLogs.reduce((s, l) => s + l.total_score, 0) / thisWeekLogs.length) : 0},
    "lastWeekAvg": ${prevWeekLogs.length ? Math.round(prevWeekLogs.reduce((s, l) => s + l.total_score, 0) / prevWeekLogs.length) : 0},
    "totalHours": ${thisWeekLogs.reduce((s, l) => s + l.deep_work_hours, 0).toFixed(1)},
    "totalCommits": ${thisWeekLogs.reduce((s, l) => s + l.github_commits, 0)},
    "logCount": ${thisWeekLogs.length},
    "topAiTool": "${(() => {
      const tools = thisWeekLogs.flatMap((l) => l.ai_tools_used ?? [])
      const freq = tools.reduce<Record<string, number>>((a, t) => { a[t] = (a[t] ?? 0) + 1; return a }, {})
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    })()}",
    "mostActiveDay": "${(() => {
      if (!thisWeekLogs.length) return ''
      const best = thisWeekLogs.reduce((a, b) => a.total_score > b.total_score ? a : b)
      return new Date(best.log_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    })()}"
  },
  
  "coachingTone": "encouraging|challenging|balanced",
  "nextWeekFocus": "One sentence. The single most important focus area for next week. Make it specific and motivating."
}

RULES:
- wins: 2-4 items. Only include real wins backed by data. Do not fabricate.
- gaps: 1-3 items. Be honest but constructive. Skip if data is genuinely strong.  
- actionItems: exactly 3-5 items. One must be priority "high". Specific verbs only.
- pillarComparisons: use the pre-filled values above exactly — do not recalculate.
- weekSummary: use the pre-filled values above exactly.
- intro: never start with "Great" or "Amazing". Be direct.
- If fewer than 3 logs this week, acknowledge the low log count prominently in intro.
- Return ONLY the JSON object. No preamble, no markdown fences.`
}
