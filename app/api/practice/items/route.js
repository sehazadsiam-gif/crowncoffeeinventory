import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET /api/practice/items  — list all active items
export async function GET() {
  const { data, error } = await supabase
    .from('practice_items')
    .select('*')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

// POST /api/practice/items  — create item
export async function POST(req) {
  try {
    const body = await req.json()
    const { name, barcode, base_unit, pack_size, par_level } = body

    if (!name || !base_unit) {
      return NextResponse.json({ error: 'name and base_unit are required' }, { status: 400 })
    }
    if (!['g', 'ml', 'pcs'].includes(base_unit)) {
      return NextResponse.json({ error: 'base_unit must be g, ml or pcs' }, { status: 400 })
    }

    const resolvedBarcode = barcode?.trim() || generateBarcode()

    const { data, error } = await supabase
      .from('practice_items')
      .insert({
        name: name.trim(),
        barcode: resolvedBarcode,
        base_unit,
        pack_size: parseInt(pack_size) || 1,
        par_level: parseInt(par_level) || 0,
        active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/practice/items  — update or deactivate item
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, name, barcode, base_unit, pack_size, par_level, active } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updates = {}
    if (name !== undefined) updates.name = name.trim()
    if (barcode !== undefined) updates.barcode = barcode.trim()
    if (base_unit !== undefined) {
      if (!['g', 'ml', 'pcs'].includes(base_unit))
        return NextResponse.json({ error: 'base_unit must be g, ml or pcs' }, { status: 400 })
      updates.base_unit = base_unit
    }
    if (pack_size !== undefined) updates.pack_size = parseInt(pack_size)
    if (par_level !== undefined) updates.par_level = parseInt(par_level)
    if (active !== undefined) updates.active = active

    const { data, error } = await supabase
      .from('practice_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function generateBarcode() {
  return 'ITEM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
}
