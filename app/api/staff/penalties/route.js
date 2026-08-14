import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabaseAdmin.from('staff_penalties').select('*')

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    if (month && year) {
      const m = String(month).padStart(2, '0')
      const y = String(year)
      const startDate = `${y}-${m}-01`
      const lastDay = new Date(Number(year), Number(month), 0).getDate()
      const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`

      query = query.gte('date', startDate).lte('date', endDate)
    }

    query = query.order('date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.warn('[GET /api/staff/penalties] DB error (table may not exist yet):', error.message)
      return NextResponse.json({ penalties: [] }, { status: 200 })
    }

    return NextResponse.json({ penalties: data || [] })
  } catch (err) {
    console.error('[GET /api/staff/penalties]', err)
    return NextResponse.json({ penalties: [] }, { status: 200 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { staff_id, date, penalty_percent = 0.5, reason = '' } = body

    if (!staff_id || !date) {
      return NextResponse.json({ error: 'staff_id and date are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('staff_penalties')
      .upsert({
        staff_id,
        date,
        penalty_percent: Number(penalty_percent) || 0.5,
        reason: reason || ''
      }, { onConflict: 'staff_id,date' })
      .select('*')

    if (error) throw error

    return NextResponse.json({ success: true, penalty: data?.[0] || null })
  } catch (err) {
    console.error('[POST /api/staff/penalties]', err)
    return NextResponse.json({ error: err.message || 'Failed to save penalty' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const staffId = searchParams.get('staff_id')
    const date = searchParams.get('date')

    let query = supabaseAdmin.from('staff_penalties')

    if (id) {
      query = query.delete().eq('id', id)
    } else if (staffId && date) {
      query = query.delete().eq('staff_id', staffId).eq('date', date)
    } else {
      return NextResponse.json({ error: 'id or (staff_id and date) required' }, { status: 400 })
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/staff/penalties]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete penalty' }, { status: 500 })
  }
}
