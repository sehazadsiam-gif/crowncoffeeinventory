import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

/**
 * GET /api/admin/pricing?itemId=<uuid>
 * Returns dine-in price + all channel prices for one item (or all items if no itemId).
 */
export async function GET(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')

  // Fetch all menu items with COGS
  let itemQuery = supabase
    .from('costing_menu_items')
    .select('id, name, category, current_cogs')
    .eq('is_active', true)
    .order('name')

  if (itemId) itemQuery = itemQuery.eq('id', itemId)

  const { data: items, error: itemErr } = await itemQuery
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  // Fetch dine-in pricing
  const { data: dineIn } = await supabase
    .from('costing_item_pricing')
    .select('menu_item_id, dine_in_price')

  // Fetch channel pricing
  const { data: channelPrices } = await supabase
    .from('costing_item_channel_pricing')
    .select('menu_item_id, channel_id, selling_price, commission_pct')

  // Fetch channels
  const { data: channels } = await supabase
    .from('costing_delivery_channels')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  // Merge
  const dineInMap = Object.fromEntries((dineIn || []).map(r => [r.menu_item_id, r.dine_in_price]))
  const channelMap = {}
  ;(channelPrices || []).forEach(r => {
    if (!channelMap[r.menu_item_id]) channelMap[r.menu_item_id] = {}
    channelMap[r.menu_item_id][r.channel_id] = { selling_price: r.selling_price, commission_pct: r.commission_pct }
  })

  const enriched = (items || []).map(item => ({
    ...item,
    dine_in_price:  dineInMap[item.id] ?? 0,
    channel_prices: channelMap[item.id] ?? {},
  }))

  return NextResponse.json({ items: enriched, channels: channels || [] })
}

/**
 * POST /api/admin/pricing
 * Upsert dine-in price and/or channel prices for an item.
 * Body: { menuItemId, dineInPrice, channelPrices: [{channelId, sellingPrice, commissionPct}] }
 */
export async function POST(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { menuItemId, dineInPrice, channelPrices = [] } = await request.json()
  if (!menuItemId) return NextResponse.json({ error: 'menuItemId required' }, { status: 400 })

  // Upsert dine-in
  if (dineInPrice !== undefined) {
    const { error: e } = await supabase
      .from('costing_item_pricing')
      .upsert({ menu_item_id: menuItemId, dine_in_price: parseFloat(dineInPrice) || 0 }, { onConflict: 'menu_item_id' })
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // Upsert channel prices
  for (const cp of channelPrices) {
    const { error: e } = await supabase
      .from('costing_item_channel_pricing')
      .upsert({
        menu_item_id:   menuItemId,
        channel_id:     cp.channelId,
        selling_price:  parseFloat(cp.sellingPrice) || 0,
        commission_pct: parseFloat(cp.commissionPct) || 0,
      }, { onConflict: 'menu_item_id,channel_id' })
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
