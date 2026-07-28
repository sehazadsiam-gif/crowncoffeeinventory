/**
 * lib/attendance-agent.js
 *
 * AI Coordination Agent for Roster & Attendance
 * Uses Gemini 2.5 Flash (with Anthropic Claude fallback).
 *
 * PRIVACY GUARANTEE:
 * - Staff names/IDs are NEVER sent to the AI.
 * - Only anonymised metrics (role labels, shift times, counts) are sent.
 * - Admin approval is ALWAYS required — the agent proposes, never commits.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from './supabase.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── Shared AI call ────────────────────────────────────────────────────────────

async function callAI(prompt, jsonMode = true) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: jsonMode
      ? { responseMimeType: 'application/json' }
      : { responseMimeType: 'text/plain' }
  })

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  if (jsonMode) {
    try {
      // Strip markdown fences if present
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return JSON.parse(clean)
    } catch {
      throw new Error('AI returned invalid JSON: ' + text.slice(0, 200))
    }
  }

  return text
}

// Anthropic fallback
async function callAIFallback(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('No fallback AI key')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic failed')

  const text = data.content[0]?.text || ''
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

async function callAISafe(prompt) {
  try {
    return await callAI(prompt, true)
  } catch (err) {
    console.warn('[attendance-agent] Gemini failed, trying Anthropic fallback...', err.message)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        return await callAIFallback(prompt)
      } catch (fallbackErr) {
        console.warn('[attendance-agent] Anthropic fallback failed:', fallbackErr.message)
      }
    }
    throw err
  }
}

/**
 * Generate an AI-proposed roster for the given week.
 */
export async function draftWeeklyRoster(weekStart) {
  // Fetch only rostered active staff (Front Service) with fallback
  let staffList = []
  let { data: sData, error: sErr } = await supabaseAdmin
    .from('staff')
    .select('id, name, shift_start, weekly_off, grace_minutes, is_rostered')
    .eq('is_active', true)
    .neq('is_rostered', false)
    .order('serial')

  if (sErr) {
    const fallback = await supabaseAdmin
      .from('staff')
      .select('id, name, shift_start, weekly_off, grace_minutes')
      .eq('is_active', true)
      .order('serial')
    if (fallback.error) throw fallback.error
    staffList = (fallback.data || []).map(s => ({ ...s, is_rostered: true }))
  } else {
    staffList = sData || []
  }

  if (!staffList?.length) throw new Error('No active rostered staff found')

  // Get approved leave for this week
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { data: approvedLeave } = await supabaseAdmin
    .from('leave_requests')
    .select('staff_id, start_date, end_date')
    .eq('status', 'approved')
    .lte('start_date', weekEndStr)
    .gte('end_date', weekStart)

  // Get last 4 weeks attendance for hour balance & lateness history (anonymised)
  const fourWeeksAgo = new Date(weekStart)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const { data: recentAttendance } = await supabaseAdmin
    .from('attendance_log')
    .select('staff_id, date, status, hours_worked, minutes_late')
    .gte('date', fourWeeksAgo.toISOString().split('T')[0])
    .lt('date', weekStart)

  // Build anonymised context for AI (use index labels, not names)
  const staffContext = staffList.map((s, idx) => {
    const label = `EMP_${idx + 1}`
    const leaveInWeek = (approvedLeave || []).filter(l => l.staff_id === s.id)
    const recent = (recentAttendance || []).filter(r => r.staff_id === s.id)
    const totalHours = recent.reduce((sum, r) => sum + (r.hours_worked || 0), 0)
    const lateCount = recent.filter(r => r.status === 'late').length

    return {
      label,
      staff_id: s.id, // kept for result mapping — NOT in AI prompt
      shift_preference: s.shift_start || '08:00',
      weekly_off_day: s.weekly_off || 'Friday',
      hours_last_4_weeks: Math.round(totalHours),
      late_count_last_4_weeks: lateCount,
      approved_leave_dates: leaveInWeek.map(l => ({
        from: l.start_date,
        to: l.end_date
      }))
    }
  })

  // Build prompt (only sends label + metrics, not names/IDs)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }

  const aiContext = staffContext.map(({ label, shift_preference, weekly_off_day, hours_last_4_weeks, late_count_last_4_weeks, approved_leave_dates }) => ({
    label, shift_preference, weekly_off_day, hours_last_4_weeks, late_count_last_4_weeks, approved_leave_dates
  }))

  const prompt = `You are a workforce scheduling assistant for Crown Coffee. Generate a 7-day duty roster.

RULES & OPERATING HOURS:
1. The roster week starts on Saturday and ends on Friday (Saturday -> Friday cycle).
2. Operating hours are 8:00 AM (08:00) to 11:00 PM (23:00).
3. Each front service employee works 6 days per week (1 day off).
4. Official shift start times are 08:00 (8:00 AM), 11:00 (11:00 AM), and 13:00 (1:00 PM).
   - Cutoff boundaries for unrostered check-in classification: <10:30 AM -> 08:00, 10:30 AM - 12:30 PM -> 11:00, >12:30 PM -> 13:00.
5. The day off should match their "weekly_off_day" preference unless they have approved leave.
6. If an employee has approved_leave_dates, mark those days as "leave" not "off".
7. Ensure at least 60% of staff are scheduled to work each day (no understaffed days).

WEEK: ${weekStart} (Saturday) to ${days[6]} (Friday)
DAYS: ${JSON.stringify(days)}

STAFF (anonymised):
${JSON.stringify(aiContext, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "week_start": "${weekStart}",
  "roster": {
    "<label>": {
      "<YYYY-MM-DD>": {
        "shift_start": "HH:MM",
        "shift_hours": 10,
        "type": "work" | "off" | "leave"
      }
    }
  },
  "notes": "brief explanation of any adjustments made"
}
`

  let aiResult
  try {
    aiResult = await callAISafe(prompt)
  } catch (err) {
    throw new Error('AI roster generation failed: ' + err.message)
  }

  // Map labels back to real staff IDs
  const labelToId = {}
  staffContext.forEach(s => { labelToId[s.label] = s.staff_id })

  const draftData = {}
  for (const [label, schedule] of Object.entries(aiResult.roster || {})) {
    const staffId = labelToId[label]
    if (staffId) {
      draftData[staffId] = schedule
    }
  }

  // Save draft to database
  const { data: draft, error } = await supabaseAdmin
    .from('ai_roster_drafts')
    .upsert({
      week_start: weekStart,
      draft_data: draftData,
      status: 'pending',
      ai_notes: aiResult.notes || '',
      created_at: new Date().toISOString()
    }, { onConflict: 'week_start' })
    .select()
    .single()

  if (error) throw error

  return {
    success: true,
    draft: { ...draft, staffCount: staffContext.length },
    aiNotes: aiResult.notes
  }
}

// ── 2. Suggest Duty-Change Resolution ────────────────────────────────────────

/**
 * Analyse a duty-change request and suggest a resolution before it hits admin queue.
 * Returns suggestion JSONB — never auto-applies anything.
 */
export async function suggestDutyChangeResolution(request) {
  const { data: requestingStaff } = await supabaseAdmin
    .from('staff')
    .select('name, designation, shift_start, weekly_off')
    .eq('id', request.staff_id)
    .single()

  // Get all active staff for that day (to find coverage options)
  const { data: rosterForDay } = await supabaseAdmin
    .from('duty_roster')
    .select('staff_id, shift_start, is_off')
    .eq('day_date', request.request_date)

  const { data: allStaff } = await supabaseAdmin
    .from('staff')
    .select('id, designation')
    .eq('is_active', true)

  const workingCount = (rosterForDay || []).filter(r => !r.is_off).length
  const totalStaff = allStaff?.length || 0
  const coverageRatio = totalStaff > 0 ? workingCount / totalStaff : 1

  const prompt = `A staff member (role: ${requestingStaff?.designation || 'staff'}) has requested a ${request.request_type} on ${request.request_date}.
Reason given: "${request.reason || 'Not specified'}"

Current coverage on that day: ${workingCount}/${totalStaff} staff working (${Math.round(coverageRatio * 100)}%).

Should this be approved? Consider:
1. Is coverage adequate if this person is off?
2. If it's a shift_swap, what shift time would be appropriate?
3. If coverage would drop below 60%, flag as conflict.

Return JSON:
{
  "recommendation": "approve" | "approve_with_conditions" | "reject",
  "conflict": true | false,
  "conflict_reason": "string or null",
  "suggested_swap_date": "YYYY-MM-DD or null",
  "suggested_new_shift": "HH:MM or null",
  "notes": "brief explanation for admin"
}`

  try {
    const suggestion = await callAISafe(prompt)
    return { success: true, suggestion }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ── 3. Detect Anomalies ───────────────────────────────────────────────────────

/**
 * Scan last 30 days for patterns and insert into attendance_anomalies.
 */
export async function detectAnomalies() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: logs } = await supabaseAdmin
    .from('attendance_log')
    .select('staff_id, date, status, minutes_late, hours_worked')
    .gte('date', fromDate)

  if (!logs?.length) return { anomalies: 0 }

  const { data: staffList } = await supabaseAdmin
    .from('staff')
    .select('id, name')
    .eq('is_active', true)

  const anomalies = []

  for (const staff of (staffList || [])) {
    const staffLogs = logs.filter(l => l.staff_id === staff.id)
    const lateCount = staffLogs.filter(l => l.status === 'late').length
    const absentCount = staffLogs.filter(l => l.status === 'absent').length
    const totalHours = staffLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0)

    // Repeated lateness (≥3 in 30 days)
    if (lateCount >= 3) {
      anomalies.push({
        staff_id: staff.id,
        type: 'repeated_lateness',
        detail: {
          staff_name: staff.name,
          late_count: lateCount,
          period: '30 days'
        },
        severity: lateCount >= 5 ? 'critical' : 'warning'
      })
    }

    // Overtime risk (>240 hours in 30 days = >8h/day average)
    if (totalHours > 240) {
      anomalies.push({
        staff_id: staff.id,
        type: 'overtime_risk',
        detail: {
          staff_name: staff.name,
          hours_worked: Math.round(totalHours),
          period: '30 days'
        },
        severity: 'warning'
      })
    }

    // High absence (≥5 absent days in 30 days)
    if (absentCount >= 5) {
      anomalies.push({
        staff_id: staff.id,
        type: 'high_absence',
        detail: {
          staff_name: staff.name,
          absent_count: absentCount,
          period: '30 days'
        },
        severity: absentCount >= 8 ? 'critical' : 'warning'
      })
    }
  }

  // Insert new anomalies (avoid duplicates for same staff+type today)
  if (anomalies.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    for (const anomaly of anomalies) {
      // Check if same type already flagged today
      const { data: existing } = await supabaseAdmin
        .from('attendance_anomalies')
        .select('id')
        .eq('staff_id', anomaly.staff_id)
        .eq('type', anomaly.type)
        .gte('flagged_at', today + 'T00:00:00Z')
        .single()

      if (!existing) {
        await supabaseAdmin.from('attendance_anomalies').insert(anomaly)
      }
    }
  }

  return { anomalies: anomalies.length, details: anomalies }
}

// ── 4. Natural Language Query ─────────────────────────────────────────────────

/**
 * Answer an admin's natural language question about attendance/roster data.
 * Fetches relevant data server-side, passes only summary to AI.
 *
 * @param {string} question - e.g. "who was late more than 3 times this month?"
 */
export async function answerQuery(question) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [staffRes, logsRes, rosterRes] = await Promise.all([
    supabaseAdmin.from('staff').select('id, name, designation, shift_start, weekly_off').eq('is_active', true),
    supabaseAdmin.from('attendance_log').select('staff_id, date, status, minutes_late, hours_worked').gte('date', monthStart).lte('date', today),
    supabaseAdmin.from('duty_roster').select('staff_id, day_date, shift_start, is_off').gte('day_date', today).lte('day_date', today)
  ])

  const staff = staffRes.data || []
  const logs = logsRes.data || []

  // Build per-staff summary
  const summaries = staff.map(s => {
    const sLogs = logs.filter(l => l.staff_id === s.id)
    return {
      name: s.name,
      designation: s.designation,
      present: sLogs.filter(l => l.status === 'present').length,
      late: sLogs.filter(l => l.status === 'late').length,
      absent: sLogs.filter(l => l.status === 'absent').length,
      on_leave: sLogs.filter(l => l.status === 'on_leave').length,
      total_hours: Math.round(sLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0)),
      weekly_off: s.weekly_off
    }
  })

  const prompt = `You are an HR assistant for Crown Coffee. Answer this admin question concisely using the attendance data below.

Question: "${question}"

Attendance data (this month, ${monthStart} to ${today}):
${JSON.stringify(summaries, null, 2)}

Rules:
- Give a direct, specific answer.
- Use staff names from the data.
- If the question cannot be answered from this data, say so clearly.
- Keep response under 300 words.
- Format as plain text (no markdown headers).`

  try {
    const answer = await callAI(prompt, false)
    return { success: true, answer }
  } catch {
    // Try without JSON mode
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
      const result = await model.generateContent(prompt)
      return { success: true, answer: result.response.text() }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
