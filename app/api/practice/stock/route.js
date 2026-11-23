import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET /api/practice/stock  — current stock per item (sum of movements)
export async function GET() {
  try {
    const [itemsRes, movRes] = await Promise.all([
      supabase.from('practice_items').select('*').order('name'),
      supabase.from('practice_stock_movements').select('item_id, quantity'),
    ])

    if (itemsRes.error) throw itemsRes.error
    if (movRes.error) throw movRes.error

    // Aggregate movements per item
    const stockMap = {}
    for (const m of movRes.data || []) {
      stockMap[m.item_id] = (stockMap[m.item_id] || 0) + m.quantity
    }

    const stock = (itemsRes.data || []).map(item => ({
      ...item,
      current_stock: stockMap[item.id] || 0,
    }))

    return NextResponse.json({ stock })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
