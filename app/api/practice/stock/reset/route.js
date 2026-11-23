import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// POST /api/practice/stock/reset — wipe all practice_ data
export async function POST(req) {
  try {
    const { confirm } = await req.json()
    if (confirm !== 'RESET') {
      return NextResponse.json({ error: 'Must send confirm: RESET' }, { status: 400 })
    }

    // Delete in dependency order
    await supabase.from('practice_stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('practice_bazar_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('practice_bazar_trips').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
