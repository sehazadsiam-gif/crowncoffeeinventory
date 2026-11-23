import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET /api/practice/trips/[id]  — get trip with lines
export async function GET(req, { params }) {
  const { id } = params
  const [tripRes, linesRes] = await Promise.all([
    supabase.from('practice_bazar_trips').select('*').eq('id', id).single(),
    supabase
      .from('practice_bazar_lines')
      .select('*, practice_items(id, name, barcode, base_unit, pack_size, par_level)')
      .eq('trip_id', id)
      .order('scanned_at'),
  ])
  if (tripRes.error) return NextResponse.json({ error: tripRes.error.message }, { status: 500 })
  if (linesRes.error) return NextResponse.json({ error: linesRes.error.message }, { status: 500 })
  return NextResponse.json({ trip: tripRes.data, lines: linesRes.data })
}

// PATCH /api/practice/trips/[id]  — approve trip
export async function PATCH(req, { params }) {
  try {
    const { id } = params
    const { total_paid, approved_by } = await req.json()

    if (!approved_by) return NextResponse.json({ error: 'approved_by is required' }, { status: 400 })
    if (total_paid === undefined || total_paid === null) {
      return NextResponse.json({ error: 'total_paid is required' }, { status: 400 })
    }

    // Fetch the trip
    const { data: trip, error: tripErr } = await supabase
      .from('practice_bazar_trips')
      .select('*')
      .eq('id', id)
      .single()
    if (tripErr || !trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    if (trip.status === 'approved') return NextResponse.json({ error: 'Trip is already approved' }, { status: 409 })

    // Fetch lines
    const { data: lines, error: linesErr } = await supabase
      .from('practice_bazar_lines')
      .select('*, practice_items(id, name, base_unit, pack_size)')
      .eq('trip_id', id)
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })
    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: 'Cannot approve a trip with no lines' }, { status: 400 })
    }

    // Create purchase movements for each line
    const movements = lines.map(line => ({
      item_id: line.item_id,
      movement_type: 'purchase',
      quantity: Math.abs(line.quantity),
      trip_id: id,
      reason: `Bazar trip approved by ${approved_by}`,
      created_by: approved_by,
    }))

    const { error: movErr } = await supabase.from('practice_stock_movements').insert(movements)
    if (movErr) return NextResponse.json({ error: movErr.message }, { status: 500 })

    // Lock the trip
    const { error: updateErr } = await supabase
      .from('practice_bazar_trips')
      .update({
        status: 'approved',
        total_paid: parseFloat(total_paid) || 0,
        approved_by,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
