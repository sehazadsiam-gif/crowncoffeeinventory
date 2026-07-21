import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { suggestDutyChangeResolution } from '../../../../lib/attendance-agent'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')

    let query = supabaseAdmin
      .from('duty_change_requests')
      .select('*, staff:staff_id(name, employee_id, designation), swap_staff:swap_with_id(name, employee_id)')
      .order('created_at', { ascending: false })

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { staff_id, request_date, request_type = 'day_off_swap', swap_with_id, new_shift_start, reason } = body

    if (!staff_id || !request_date) {
      return NextResponse.json({ error: 'staff_id and request_date are required' }, { status: 400 })
    }

    const newReq = {
      staff_id,
      request_date,
      request_type,
      swap_with_id: swap_with_id || null,
      new_shift_start: new_shift_start || null,
      reason: reason || '',
      status: 'pending'
    }

    // Get AI proactive resolution suggestion
    const aiRes = await suggestDutyChangeResolution(newReq)
    if (aiRes.success) {
      newReq.ai_suggestion = aiRes.suggestion
      newReq.conflict_flag = aiRes.suggestion?.conflict || false
      newReq.conflict_detail = aiRes.suggestion?.conflict_reason || null
    }

    const { data, error } = await supabaseAdmin
      .from('duty_change_requests')
      .insert(newReq)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, status, admin_note } = await request.json()

    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Valid id and status (approved/rejected) required' }, { status: 400 })
    }

    // Get the request details
    const { data: reqData, error: reqErr } = await supabaseAdmin
      .from('duty_change_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (reqErr || !reqData) throw new Error('Request not found')

    let autoUpdatedRoster = false
    let rosterConflict = false

    if (status === 'approved') {
      const weekStart = getMondayOf(reqData.request_date)
      
      if (reqData.request_type === 'day_off_swap') {
        const { error: rosErr } = await supabaseAdmin
          .from('duty_roster')
          .upsert({
            staff_id: reqData.staff_id,
            week_start: weekStart,
            day_date: reqData.request_date,
            shift_start: reqData.new_shift_start || '10:00',
            is_off: true,
            is_duty_change: true
          }, { onConflict: 'staff_id,day_date' })

        if (!rosErr) autoUpdatedRoster = true
        else rosterConflict = true
      } else if (reqData.request_type === 'shift_swap') {
        const { error: rosErr } = await supabaseAdmin
          .from('duty_roster')
          .upsert({
            staff_id: reqData.staff_id,
            week_start: weekStart,
            day_date: reqData.request_date,
            shift_start: reqData.new_shift_start || '10:00',
            is_off: false,
            is_duty_change: true
          }, { onConflict: 'staff_id,day_date' })

        if (!rosErr) autoUpdatedRoster = true
        else rosterConflict = true
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('duty_change_requests')
      .update({
        status,
        admin_note: admin_note || null,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      request: updated,
      autoUpdatedRoster,
      rosterConflict
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function getMondayOf(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
