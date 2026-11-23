import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// POST /api/practice/stock/use  — simulate a sale (negative "usage" movement)
export async function POST(req) {
  try {
    const { item_id, quantity, reason, created_by } = await req.json()

    if (!item_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'item_id and a positive quantity are required' }, { status: 400 })
    }

    // Validate item exists
    const { data: item, error: itemErr } = await supabase
      .from('practice_items')
      .select('id, name')
      .eq('id', item_id)
      .single()

    if (itemErr || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const { error } = await supabase.from('practice_stock_movements').insert({
      item_id,
      movement_type: 'usage',
      quantity: -Math.abs(parseInt(quantity)),
      reason: reason || 'Simulated usage',
      created_by: created_by || 'staff',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
