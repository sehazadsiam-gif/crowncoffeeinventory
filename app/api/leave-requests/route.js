import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'

// GET: fetch leave requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')

    let query = supabaseAdmin
      .from('leave_requests')
      .select('*, staff(name, employee_id, designation)')
      .order('created_at', { ascending: false })

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ requests: data || [] })
  } catch (err) {
    console.error('[GET /api/leave-requests]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: submit a new leave request
export async function POST(request) {
  try {
    const body = await request.json()
    const { staff_id, start_date, end_date, leave_type = 'annual', reason = '' } = body

    if (!staff_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'staff_id, start_date, end_date required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert([{
        staff_id,
        start_date,
        end_date,
        leave_type,
        reason,
        status: 'pending'
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: data })
  } catch (err) {
    console.error('[POST /api/leave-requests]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT: approve / reject leave request by admin
export async function PUT(request) {
  try {
    const body = await request.json()
    const { request_id, action } = body // action: 'approve' | 'reject'

    if (!request_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Valid request_id and action required' }, { status: 400 })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'

    const { data: reqItem, error: fetchErr } = await supabaseAdmin
      .from('leave_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request_id)
      .select()
      .single()

    if (fetchErr) throw fetchErr

    // If approved, insert/update attendance_log rows for dates between start_date and end_date as 'on_leave'
    if (action === 'approve' && reqItem) {
      const start = new Date(reqItem.start_date)
      const end = new Date(reqItem.end_date)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]

        const { data: existing } = await supabaseAdmin
          .from('attendance_log')
          .select('id')
          .eq('staff_id', reqItem.staff_id)
          .eq('date', dateStr)
          .maybeSingle()

        const payload = {
          staff_id: reqItem.staff_id,
          date: dateStr,
          status: 'on_leave',
          hours_worked: 0,
          notes: `Leave approved: ${reqItem.leave_type} - ${reqItem.reason || 'No reason'}`,
          updated_at: new Date().toISOString()
        }

        if (existing) {
          await supabaseAdmin.from('attendance_log').update(payload).eq('id', existing.id)
        } else {
          await supabaseAdmin.from('attendance_log').insert(payload)
        }
      }
    }

    return NextResponse.json({ success: true, status, request: reqItem })
  } catch (err) {
    console.error('[PUT /api/leave-requests]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
