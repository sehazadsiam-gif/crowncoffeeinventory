import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'
import { calculateLineCost, round4 } from '../../../../lib/costing-calculations'

/**
 * PATCH /api/costing/bulk-update
 * Update an ingredient's price across ALL item_ingredients rows that use it,
 * then recalculate and cache COGS for each affected menu item.
 *
 * Body: { ingredientName, newPrice, newPriceBasisUnit }
 */
export async function PATCH(request) {
  const { error, status, session } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { ingredientName, newPrice, newPriceBasisUnit } = await request.json()

  if (!ingredientName || newPrice === undefined || !newPriceBasisUnit) {
    return NextResponse.json({ error: 'ingredientName, newPrice, and newPriceBasisUnit required' }, { status: 400 })
  }

  // 1. Fetch all rows matching this ingredient name
  const { data: rows, error: fetchErr } = await supabase
    .from('costing_item_ingredients')
    .select('id, menu_item_id, quantity, unit, price_basis_unit')
    .ilike('ingredient_name', ingredientName.trim())

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!rows?.length) return NextResponse.json({ updatedRows: 0, updatedItems: 0 })

  // 2. Update each row's price + line_cost
  const updates = rows.map(row => {
    const lc = calculateLineCost(row.quantity, row.unit, newPrice, newPriceBasisUnit)
    return supabase
      .from('costing_item_ingredients')
      .update({
        price:            parseFloat(newPrice),
        price_basis_unit: newPriceBasisUnit,
        line_cost:        lc !== null ? round4(lc) : null,
      })
      .eq('id', row.id)
  })
  await Promise.all(updates)

  // 3. Recalculate total COGS for each affected menu item
  const affectedItemIds = [...new Set(rows.map(r => r.menu_item_id))]

  await Promise.all(affectedItemIds.map(async (itemId) => {
    const { data: allRows } = await supabase
      .from('costing_item_ingredients')
      .select('line_cost')
      .eq('menu_item_id', itemId)

    const totalCogs = round4((allRows || []).reduce((s, r) => s + (r.line_cost || 0), 0))

    await supabase
      .from('costing_menu_items')
      .update({ current_cogs: totalCogs })
      .eq('id', itemId)

    // Log history
    const { data: snap } = await supabase
      .from('costing_item_ingredients')
      .select('ingredient_name, quantity, unit, price, price_basis_unit, line_cost')
      .eq('menu_item_id', itemId)

    await supabase.from('costing_cogs_history').insert({
      menu_item_id: itemId,
      total_cogs:   totalCogs,
      saved_by:     session?.user_id || null,
      snapshot:     snap || [],
    })
  }))

  return NextResponse.json({
    ok: true,
    updatedRows:  rows.length,
    updatedItems: affectedItemIds.length,
  })
}
