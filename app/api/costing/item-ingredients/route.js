import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'
import { calculateLineCost, calculateItemCOGS, round4 } from '../../../../lib/costing-calculations'

// GET /api/costing/item-ingredients?itemId=<uuid>
export async function GET(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_item_ingredients')
    .select('id, ingredient_id, ingredient_name, quantity, unit, price, price_basis_unit, line_cost, sort_order')
    .eq('menu_item_id', itemId)
    .order('sort_order')

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * POST /api/costing/item-ingredients
 * Body: { menuItemId, rows: [{ingredient_name, quantity, unit, price, price_basis_unit}], savedBy }
 * Replaces all rows for the item (delete-then-insert) and logs COGS history.
 */
export async function POST(request) {
  const { error, status, session } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { menuItemId, rows } = await request.json()
  if (!menuItemId || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'menuItemId and rows required' }, { status: 400 })
  }

  // 1. Upsert ingredients into master list + resolve IDs
  const enrichedRows = await Promise.all(rows.map(async (row, i) => {
    let ingredientId = row.ingredient_id || null
    if (!ingredientId && row.ingredient_name?.trim()) {
      const { data } = await supabase
        .from('costing_ingredients')
        .upsert({ name: row.ingredient_name.trim() }, { onConflict: 'name' })
        .select('id').single()
      ingredientId = data?.id || null
    }
    const lc = calculateLineCost(row.quantity, row.unit, row.price, row.price_basis_unit)
    return {
      menu_item_id:    menuItemId,
      ingredient_id:   ingredientId,
      ingredient_name: (row.ingredient_name || '').trim(),
      quantity:        parseFloat(row.quantity) || 0,
      unit:            row.unit,
      price:           parseFloat(row.price) || 0,
      price_basis_unit: row.price_basis_unit,
      line_cost:       lc !== null ? round4(lc) : null,
      sort_order:      i,
    }
  }))

  // 2. Delete old rows for this item
  const { error: delErr } = await supabase
    .from('costing_item_ingredients')
    .delete()
    .eq('menu_item_id', menuItemId)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // 3. Insert new rows
  const { error: insErr } = await supabase
    .from('costing_item_ingredients')
    .insert(enrichedRows)

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // 4. Calculate total COGS
  const totalCogs = round4(calculateItemCOGS(enrichedRows))

  // 5. Update cached COGS on menu item
  await supabase
    .from('costing_menu_items')
    .update({ current_cogs: totalCogs })
    .eq('id', menuItemId)

  // 6. Log COGS history
  await supabase.from('costing_cogs_history').insert({
    menu_item_id: menuItemId,
    total_cogs:   totalCogs,
    saved_by:     session?.user_id || null,
    snapshot:     enrichedRows.map(r => ({
      ingredient_name:  r.ingredient_name,
      quantity:         r.quantity,
      unit:             r.unit,
      price:            r.price,
      price_basis_unit: r.price_basis_unit,
      line_cost:        r.line_cost,
    })),
  })

  return NextResponse.json({ ok: true, totalCogs, rows: enrichedRows })
}
