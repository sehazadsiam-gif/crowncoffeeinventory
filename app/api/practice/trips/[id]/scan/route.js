import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Quantity barcodes — prefix QTY- to never clash with item barcodes
const QTY_BARCODES = {
  'QTY-X1':       { multiplier: 1,    unit: null },
  'QTY-X5':       { multiplier: 5,    unit: null },
  'QTY-X10':      { multiplier: 10,   unit: null },
  'QTY-X50':      { multiplier: 50,   unit: null },
  'QTY-PLUS1KG':  { addGrams: 1000,   unit: 'g'  },
  'QTY-PLUS5KG':  { addGrams: 5000,   unit: 'g'  },
}

// POST /api/practice/trips/[id]/scan
// Body: { barcode, scanned_by }
// Returns: { type: 'item'|'qty', action, line? }
export async function POST(req, { params }) {
  try {
    const { id } = params
    const { barcode, scanned_by } = await req.json()

    if (!barcode) return NextResponse.json({ error: 'barcode is required' }, { status: 400 })

    // Verify trip is open
    const { data: trip, error: tripErr } = await supabase
      .from('practice_bazar_trips')
      .select('id, status')
      .eq('id', id)
      .single()

    if (tripErr || !trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    if (trip.status !== 'open') return NextResponse.json({ error: 'Trip is already approved' }, { status: 409 })

    const normalizedBarcode = barcode.trim().toUpperCase()

    // --- Quantity barcode? ---
    const qtyDef = QTY_BARCODES[normalizedBarcode]
    if (qtyDef) {
      // Find the last scanned line (most recent scanned_at)
      const { data: lastLine, error: lastErr } = await supabase
        .from('practice_bazar_lines')
        .select('*, practice_items(id, name, base_unit, pack_size)')
        .eq('trip_id', id)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastErr) return NextResponse.json({ error: lastErr.message }, { status: 500 })
      if (!lastLine) return NextResponse.json({ error: 'Scan an item first before scanning a quantity code' }, { status: 400 })

      const item = lastLine.practice_items
      let addQty = 0

      if (qtyDef.addGrams !== undefined) {
        // Only valid for g items
        if (item.base_unit !== 'g') {
          return NextResponse.json({
            error: `${item.name} is in ${item.base_unit}, not grams. Cannot apply kg quantity code.`
          }, { status: 400 })
        }
        addQty = qtyDef.addGrams
      } else {
        // Multiplier × pack_size
        addQty = qtyDef.multiplier * item.pack_size
      }

      const newQty = lastLine.quantity + addQty
      const { data: updated, error: updateErr } = await supabase
        .from('practice_bazar_lines')
        .update({ quantity: newQty })
        .eq('id', lastLine.id)
        .select('*, practice_items(id, name, barcode, base_unit, pack_size, par_level)')
        .single()

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
      return NextResponse.json({ type: 'qty', action: 'updated', line: updated })
    }

    // --- Item barcode? ---
    const { data: item, error: itemErr } = await supabase
      .from('practice_items')
      .select('*')
      .eq('barcode', barcode.trim())
      .eq('active', true)
      .maybeSingle()

    if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
    if (!item) return NextResponse.json({ error: `No active practice item with barcode "${barcode}"` }, { status: 404 })

    // Check if this item already has a line in this trip
    const { data: existingLine, error: existErr } = await supabase
      .from('practice_bazar_lines')
      .select('*')
      .eq('trip_id', id)
      .eq('item_id', item.id)
      .maybeSingle()

    if (existErr) return NextResponse.json({ error: existErr.message }, { status: 500 })

    if (existingLine) {
      // Add one more pack_size
      const newQty = existingLine.quantity + item.pack_size
      const { data: updated, error: upErr } = await supabase
        .from('practice_bazar_lines')
        .update({ quantity: newQty, scanned_at: new Date().toISOString(), scanned_by: scanned_by || 'staff' })
        .eq('id', existingLine.id)
        .select('*, practice_items(id, name, barcode, base_unit, pack_size, par_level)')
        .single()

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      return NextResponse.json({ type: 'item', action: 'updated', line: updated })
    } else {
      // Insert new line with default pack_size
      const { data: newLine, error: newErr } = await supabase
        .from('practice_bazar_lines')
        .insert({
          trip_id: id,
          item_id: item.id,
          quantity: item.pack_size,
          scanned_by: scanned_by || 'staff',
          scanned_at: new Date().toISOString(),
        })
        .select('*, practice_items(id, name, barcode, base_unit, pack_size, par_level)')
        .single()

      if (newErr) return NextResponse.json({ error: newErr.message }, { status: 500 })
      return NextResponse.json({ type: 'item', action: 'added', line: newLine })
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
