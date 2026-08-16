import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1), 10)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear(), 10)

    const mStr = String(month).padStart(2, '0')
    const startDate = `${year}-${mStr}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`

    // 1. Fetch active staff
    const { data: staffList, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, photo_url, base_salary')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (staffErr) throw staffErr
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ leaderboard: [], month, year })
    }

    // 2. Fetch month attendance logs
    const { data: attendanceLogs } = await supabaseAdmin
      .from('attendance_log')
      .select('staff_id, status, minutes_late')
      .gte('date', startDate)
      .lte('date', endDate)

    // 3. Fetch month service penalties
    const { data: penalties } = await supabaseAdmin
      .from('staff_penalties')
      .select('staff_id, penalty_percent')
      .gte('date', startDate)
      .lte('date', endDate)

    // 4. Fetch month tasks (try assigned_tasks or staff_tasks)
    let tasks = []
    const { data: tData } = await supabaseAdmin
      .from('assigned_tasks')
      .select('assigned_to, status')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
    if (tData) tasks = tData

    // 5. Fetch month admin evaluations from staff_evaluations OR staff_notes (performance_eval)
    let evaluationsMap = {}
    
    // Primary: try staff_evaluations
    try {
      const { data: evals } = await supabaseAdmin
        .from('staff_evaluations')
        .select('*')
        .eq('month', month)
        .eq('year', year)

      if (evals && evals.length > 0) {
        evals.forEach(e => {
          evaluationsMap[e.staff_id] = e
        })
      }
    } catch (_) {}

    // Fallback/Unified: query staff_notes where note_type = 'performance_eval'
    try {
      const { data: noteEvals } = await supabaseAdmin
        .from('staff_notes')
        .select('*')
        .eq('note_type', 'performance_eval')
        .order('created_at', { ascending: true })

      if (noteEvals && noteEvals.length > 0) {
        noteEvals.forEach(n => {
          try {
            const parsed = JSON.parse(n.note)
            if (Number(parsed.month) === month && Number(parsed.year) === year) {
              evaluationsMap[n.staff_id] = {
                staff_id: n.staff_id,
                month: Number(parsed.month),
                year: Number(parsed.year),
                admin_score: Number(parsed.admin_score),
                admin_comments: parsed.admin_comments || '',
                awarded_bonus: Number(parsed.awarded_bonus) || 0
              }
            }
          } catch (_) {}
        })
      }
    } catch (_) {}

    // Process maps
    const attMap = {}
    ;(attendanceLogs || []).forEach(l => {
      if (!attMap[l.staff_id]) attMap[l.staff_id] = { late: 0, absent: 0, present: 0 }
      if (l.status === 'late') attMap[l.staff_id].late += 1
      else if (l.status === 'absent') attMap[l.staff_id].absent += 1
      else if (l.status === 'present') attMap[l.staff_id].present += 1
    })

    const penMap = {}
    ;(penalties || []).forEach(p => {
      penMap[p.staff_id] = (penMap[p.staff_id] || 0) + 1
    })

    const taskMap = {}
    tasks.forEach(t => {
      if (!taskMap[t.assigned_to]) taskMap[t.assigned_to] = { total: 0, done: 0 }
      taskMap[t.assigned_to].total += 1
      if (t.status === 'completed' || t.status === 'done') taskMap[t.assigned_to].done += 1
    })

    // Calculate score for each staff
    const leaderboard = staffList.map(s => {
      const att = attMap[s.id] || { late: 0, absent: 0, present: 0 }
      const penCount = penMap[s.id] || 0
      const tStats = taskMap[s.id] || { total: 0, done: 0 }
      const ev = evaluationsMap[s.id] || {}

      // A. Punctuality Score (Max 40 Pts)
      let punctualityScore = 40 - (att.late * 5) - (att.absent * 10)
      if (punctualityScore < 0) punctualityScore = 0

      // B. Task Completion Rate Score (Max 30 Pts)
      let taskScore = 30
      if (tStats.total > 0) {
        taskScore = Math.round((tStats.done / tStats.total) * 30)
      }

      // C. Service Quality & Penalty Score (Max 30 Pts)
      let qualityScore = 30 - (penCount * 10)
      if (qualityScore < 0) qualityScore = 0

      // Combined System Auto-Score (Max 100 Pts)
      const systemScore = punctualityScore + taskScore + qualityScore

      // D. Admin Manual Assessment Score (Max 100 Pts)
      const adminScore = ev.admin_score !== undefined && ev.admin_score !== null ? Number(ev.admin_score) : 100

      // Combined Final Performance Score (Max 200 Pts)
      const totalScore = systemScore + adminScore

      const adminComments = ev.admin_comments || ''
      const awardedBonus = Number(ev.awarded_bonus) || 0

      return {
        staff_id: s.id,
        name: s.name,
        employee_id: s.employee_id || 'N/A',
        designation: s.designation || 'Staff',
        department: s.department || 'Operations',
        photo_url: s.photo_url || null,
        base_salary: s.base_salary || 0,
        attendance_stats: att,
        penalty_count: penCount,
        task_stats: tStats,
        scores: {
          punctuality_score: punctualityScore,
          task_score: taskScore,
          quality_score: qualityScore,
          system_score: systemScore,
          admin_score: adminScore,
          total_score: totalScore
        },
        admin_comments: adminComments,
        awarded_bonus: awardedBonus
      }
    })

    // Sort by total_score descending
    leaderboard.sort((a, b) => b.scores.total_score - a.scores.total_score)

    // Assign rank
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1
    })

    return NextResponse.json({ leaderboard, month, year })
  } catch (err) {
    console.error('[GET /api/staff/performance]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch performance scores' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { staff_id, month, year, admin_score, admin_comments = '', awarded_bonus = 0 } = body

    if (!staff_id || !month || !year) {
      return NextResponse.json({ error: 'staff_id, month, and year are required' }, { status: 400 })
    }

    const numScore = Math.min(100, Math.max(0, Number(admin_score) || 0))
    const numBonus = Number(awarded_bonus) || 0
    const mNum = Number(month)
    const yNum = Number(year)

    const evalPayload = {
      month: mNum,
      year: yNum,
      admin_score: numScore,
      admin_comments: admin_comments || '',
      awarded_bonus: numBonus
    }

    // 1. Try staff_evaluations table
    try {
      await supabaseAdmin
        .from('staff_evaluations')
        .upsert({
          staff_id,
          ...evalPayload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'staff_id,month,year' })
    } catch (e) {
      console.warn('[POST /api/staff/performance] staff_evaluations notice:', e.message)
    }

    // 2. Guaranteed persistence: Save to staff_notes table as performance_eval
    const noteContent = JSON.stringify(evalPayload)

    // Remove any previous performance_eval note for this staff & month/year
    const { data: existingNotes } = await supabaseAdmin
      .from('staff_notes')
      .select('id, note')
      .eq('staff_id', staff_id)
      .eq('note_type', 'performance_eval')

    if (existingNotes && existingNotes.length > 0) {
      for (const en of existingNotes) {
        try {
          const p = JSON.parse(en.note)
          if (Number(p.month) === mNum && Number(p.year) === yNum) {
            await supabaseAdmin.from('staff_notes').delete().eq('id', en.id)
          }
        } catch (_) {}
      }
    }

    const { data: insertedNote, error: noteErr } = await supabaseAdmin
      .from('staff_notes')
      .insert({
        staff_id,
        note_type: 'performance_eval',
        note: noteContent
      })
      .select('*')

    if (noteErr) {
      console.error('[POST /api/staff/performance] staff_notes insert error:', noteErr.message)
      throw noteErr
    }

    // 3. Sync bonus to payroll_entries if bonus > 0
    if (numBonus > 0) {
      try {
        const { data: existingPay } = await supabaseAdmin
          .from('payroll_entries')
          .select('id')
          .eq('staff_id', staff_id)
          .eq('month', mNum)
          .eq('year', yNum)
          .single()

        if (existingPay) {
          await supabaseAdmin
            .from('payroll_entries')
            .update({ bonus: numBonus })
            .eq('id', existingPay.id)
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, evaluation: evalPayload })
  } catch (err) {
    console.error('[POST /api/staff/performance]', err)
    return NextResponse.json({ error: err.message || 'Failed to save evaluation' }, { status: 500 })
  }
}
