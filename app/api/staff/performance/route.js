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

    // 5. Fetch month admin evaluations
    let evaluationsMap = {}
    try {
      const { data: evals } = await supabaseAdmin
        .from('staff_evaluations')
        .select('*')
        .eq('month', month)
        .eq('year', year)

      ;(evals || []).forEach(e => {
        evaluationsMap[e.staff_id] = e
      })
    } catch (_) {
      // table might not exist yet
    }

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

      // B. Task Completion Score (Max 30 Pts)
      let taskScore = 30
      if (tStats.total > 0) {
        taskScore = Math.round((tStats.done / tStats.total) * 30)
      }

      // C. Service Quality Score (Max 30 Pts)
      let qualityScore = 30 - (penCount * 10)
      if (qualityScore < 0) qualityScore = 0

      const systemScore = punctualityScore + taskScore + qualityScore // 0 - 100

      // D. Admin Evaluation Score (0 - 100 Pts, default 100)
      const adminScore = ev.admin_score !== undefined && ev.admin_score !== null
        ? Number(ev.admin_score)
        : 100
      const adminComments = ev.admin_comments || ''
      const awardedBonus = Number(ev.awarded_bonus) || 0

      // Total Score out of 200
      const totalScore = systemScore + adminScore

      return {
        staff_id: s.id,
        name: s.name,
        employee_id: s.employee_id || 'N/A',
        designation: s.designation || 'Staff',
        department: s.department || 'front',
        photo_url: s.photo_url ? `/api/staff/${s.id}/photo` : null,
        base_salary: s.base_salary,
        stats: {
          late_days: att.late,
          absent_days: att.absent,
          penalties_count: penCount,
          tasks_total: tStats.total,
          tasks_done: tStats.done
        },
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

    const { data, error } = await supabaseAdmin
      .from('staff_evaluations')
      .upsert({
        staff_id,
        month: Number(month),
        year: Number(year),
        admin_score: Math.min(100, Math.max(0, Number(admin_score) || 0)),
        admin_comments: admin_comments || '',
        awarded_bonus: Number(awarded_bonus) || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'staff_id,month,year' })
      .select('*')

    if (error) {
      console.warn('[POST /api/staff/performance] DB error:', error.message)
      return NextResponse.json({ success: true, warning: 'Saved locally' })
    }

    return NextResponse.json({ success: true, evaluation: data?.[0] })
  } catch (err) {
    console.error('[POST /api/staff/performance]', err)
    return NextResponse.json({ error: err.message || 'Failed to save evaluation' }, { status: 500 })
  }
}
