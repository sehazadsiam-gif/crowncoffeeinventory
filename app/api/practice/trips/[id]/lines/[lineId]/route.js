import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// PATCH /api/practice/trips/[id]/lines/[lineId]  — update qty via +/- buttons
export async function PATCH(req, { params }) {
  try {
    const { id, lineId } = params
    const { quantity } = await req.json()

    // Verify trip is open
    const { data: trip } = await supabase
      .from('practice_bazar_trips')
      .select('status')
      .eq('id', id)
      .single()

    if (!trip || trip.status !== 'open') {
      return NextResponse.json({ error: 'Trip is not open' }, { status: 409 })
    }

    if (quantity < 0) {
      return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 })
    }

    if (quantity === 0) {
      // Delete the line
      const { error } = await supabase.from('practice_bazar_lines').delete().eq('id', lineId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ deleted: true })
    }

    const { data, error } = await supabase
      .from('practice_bazar_lines')
      .update({ quantity })
      .eq('id', lineId)
      .eq('trip_id', id)
      .select('*, practice_items(id, name, barcode, base_unit, pack_size, par_level)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ line: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/practice/trips/[id]/lines/[lineId]
export async function DELETE(req, { params }) {
  try {
    const { id, lineId } = params

    const { data: trip } = await supabase
      .from('practice_bazar_trips')
      .select('status')
      .eq('id', id)
      .single()

    if (!trip || trip.status !== 'open') {
      return NextResponse.json({ error: 'Trip is not open' }, { status: 409 })
    }

    const { error } = await supabase
      .from('practice_bazar_lines')
      .delete()
      .eq('id', lineId)
      .eq('trip_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
