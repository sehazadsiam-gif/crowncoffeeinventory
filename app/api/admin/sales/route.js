import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

/**
 * GET /api/admin/sales?year=2025&month=7
 * Returns all sales entries for the given month.
 */
export async function GET(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const year  = parseInt(searchParams.get('year'), 10)
  const month = parseInt(searchParams.get('month'), 10)

  if (!year || !month) return NextResponse.json({ error: 'year and month required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_sales_monthly')
    .select('id, menu_item_id, channel_id, quantity_sold, costing_menu_items(name, current_cogs), costing_delivery_channels(name)')
    .eq('year', year)
    .eq('month', month)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * POST /api/admin/sales
 * Body: { year, month, entries: [{menuItemId, channelId|null, quantitySold}] }
 * Upserts each entry.
 */
export async function POST(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { year, month, entries } = await request.json()
  if (!year || !month || !Array.isArray(entries)) {
    return NextResponse.json({ error: 'year, month, and entries required' }, { status: 400 })
  }

  const rows = entries.map(e => ({
    menu_item_id:  e.menuItemId,
    year,
    month,
    channel_id:    e.channelId || null,
    quantity_sold: parseInt(e.quantitySold, 10) || 0,
  }))

  const { error: dbErr } = await supabase
    .from('costing_sales_monthly')
    .upsert(rows, { onConflict: 'menu_item_id,year,month,channel_id' })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, upserted: rows.length })
}

// DELETE /api/admin/sales?id=<uuid>
export async function DELETE(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbErr } = await supabase.from('costing_sales_monthly').delete().eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
