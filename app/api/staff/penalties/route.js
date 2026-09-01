import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getDbClient() {
  const connStr = process.env.DATABASE_URL || 'postgres://postgres:YJEwDbQHPOF6Te4Yk1c8vQqTaa6yaKwcv1dLnb9682HDFGmwDbSk0OdiwxcTFXts@169.58.136.137:5432/postgres'
  return new Client({ connectionString: connStr, connectionTimeoutMillis: 3000 })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staff_id')
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  // 1. Direct PG query
  try {
    const client = getDbClient()
    await client.connect()

    let sql = 'SELECT * FROM staff_penalties WHERE 1=1'
    const params = []

    if (staffId) {
      params.push(staffId)
      sql += ` AND staff_id = $${params.length}`
    }

    if (month && year) {
      const m = String(month).padStart(2, '0')
      const y = String(year)
      const startDate = `${y}-${m}-01`
      const lastDay = new Date(Number(year), Number(month), 0).getDate()
      const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
      params.push(startDate, endDate)
      sql += ` AND date >= $${params.length - 1} AND date <= $${params.length}`
    }

    sql += ' ORDER BY date DESC'
    const res = await client.query(sql, params)
    await client.end()

    // Format dates to YYYY-MM-DD
    const formatted = (res.rows || []).map(r => {
      let dStr = r.date
      if (r.date instanceof Date) {
        dStr = r.date.toISOString().split('T')[0]
      }
      return { ...r, date: dStr }
    })

    return NextResponse.json({ penalties: formatted })
  } catch (pgErr) {
    console.warn('[GET /api/staff/penalties] PG error, trying Supabase fallback:', pgErr.message)
  }

  // 2. Supabase Fallback
  try {
    let query = supabaseAdmin.from('staff_penalties').select('*')
    if (staffId) query = query.eq('staff_id', staffId)

    if (month && year) {
      const m = String(month).padStart(2, '0')
      const y = String(year)
      const startDate = `${y}-${m}-01`
      const lastDay = new Date(Number(year), Number(month), 0).getDate()
      const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
      query = query.gte('date', startDate).lte('date', endDate)
    }

    query = query.order('date', { ascending: false })
    const { data } = await query
    return NextResponse.json({ penalties: data || [] })
  } catch (err) {
    console.error('[GET /api/staff/penalties] Fallback error:', err)
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

    // Direct PG upsert
    try {
      const client = getDbClient()
      await client.connect()
      const sql = `
        INSERT INTO staff_penalties (staff_id, date, penalty_percent, reason)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (staff_id, date) DO UPDATE
        SET penalty_percent = EXCLUDED.penalty_percent, reason = EXCLUDED.reason
        RETURNING *;
      `
      const res = await client.query(sql, [staff_id, date, Number(penalty_percent) || 0.5, reason || null])
      await client.end()
      return NextResponse.json({ success: true, penalty: res.rows[0] })
    } catch (pgErr) {
      console.warn('[POST /api/staff/penalties] PG error, trying Supabase:', pgErr.message)
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

    if (!id && !(staffId && date)) {
      return NextResponse.json({ error: 'id or (staff_id and date) required' }, { status: 400 })
    }

    // Direct PG delete
    try {
      const client = getDbClient()
      await client.connect()
      if (id) {
        await client.query('DELETE FROM staff_penalties WHERE id = $1', [id])
      } else {
        await client.query('DELETE FROM staff_penalties WHERE staff_id = $1 AND date = $2', [staffId, date])
      }
      await client.end()
      return NextResponse.json({ success: true })
    } catch (pgErr) {
      console.warn('[DELETE /api/staff/penalties] PG error, trying Supabase:', pgErr.message)
    }

    let query = supabaseAdmin.from('staff_penalties')
    if (id) {
      query = query.delete().eq('id', id)
    } else {
      query = query.delete().eq('staff_id', staffId).eq('date', date)
    }

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/staff/penalties]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete penalty' }, { status: 500 })
  }
}
