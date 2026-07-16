import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

// GET /api/costing/cogs-history?itemId=<uuid>&limit=20
export async function GET(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')
  const limit  = parseInt(searchParams.get('limit') || '20', 10)

  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_cogs_history')
    .select('id, total_cogs, snapshot, created_at, costing_users(name)')
    .eq('menu_item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}
