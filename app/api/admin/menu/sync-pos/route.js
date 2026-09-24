import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../../lib/supabase'
import { requireRole } from '../../../../../lib/costing-auth'

/**
 * POST /api/admin/menu/sync-pos
 * Synchronizes menu_items (POS) into costing_menu_items and costing_item_pricing in fast batch.
 */
export async function POST(request) {
  const { error: authErr, status } = await requireRole(request, 'admin')
  if (authErr) return NextResponse.json({ error: authErr }, { status })

  try {
    // 1. Fetch POS items with recipes & ingredients
    const { data: posItems, error: posErr } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        category,
        selling_price,
        is_active,
        recipes (
          quantity,
          ingredients (
            cost_per_unit
          )
        )
      `)

    if (posErr) return NextResponse.json({ error: posErr.message }, { status: 500 })

    // 2. Fetch existing costing items in 1 query
    const { data: existingCmi, error: cmiErr } = await supabase
      .from('costing_menu_items')
      .select('id, name, current_cogs')

    if (cmiErr) return NextResponse.json({ error: cmiErr.message }, { status: 500 })

    const cmiMap = new Map()
    ;(existingCmi || []).forEach(item => {
      if (item.name) cmiMap.set(item.name.toLowerCase().trim(), item)
    })

    const itemsToInsert = []
    const itemsToUpdate = []
    const priceUpserts = []

    for (const item of (posItems || [])) {
      const cleanName = String(item.name || '').trim()
      if (!cleanName) continue

      let computedCogs = 0
      if (Array.isArray(item.recipes)) {
        item.recipes.forEach(r => {
          const qty = parseFloat(r.quantity) || 0
          const unitCost = parseFloat(r.ingredients?.cost_per_unit) || 0
          computedCogs += qty * unitCost
        })
      }
      computedCogs = parseFloat(computedCogs.toFixed(2))

      const existing = cmiMap.get(cleanName.toLowerCase())
      const price = parseFloat(item.selling_price) || 0

      if (existing) {
        itemsToUpdate.push({
          id: existing.id,
          name: cleanName,
          category: item.category || 'General',
          current_cogs: computedCogs > 0 ? computedCogs : existing.current_cogs || 0,
          is_active: item.is_active ?? true
        })
        if (price > 0) {
          priceUpserts.push({
            menu_item_id: existing.id,
            dine_in_price: price,
            updated_at: new Date().toISOString()
          })
        }
      } else {
        itemsToInsert.push({
          name: cleanName,
          category: item.category || 'General',
          current_cogs: computedCogs,
          is_active: item.is_active ?? true,
          _price: price
        })
      }
    }

    // Perform bulk updates
    if (itemsToUpdate.length > 0) {
      for (let i = 0; i < itemsToUpdate.length; i += 50) {
        const chunk = itemsToUpdate.slice(i, i + 50)
        await supabase.from('costing_menu_items').upsert(chunk, { onConflict: 'id' })
      }
    }

    // Perform bulk inserts
    if (itemsToInsert.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('costing_menu_items')
        .insert(itemsToInsert.map(i => ({
          name: i.name,
          category: i.category,
          current_cogs: i.current_cogs,
          is_active: i.is_active
        })))
        .select('id, name')

      if (!insErr && Array.isArray(inserted)) {
        inserted.forEach(ins => {
          const original = itemsToInsert.find(x => x.name.toLowerCase() === ins.name.toLowerCase())
          if (original && original._price > 0) {
            priceUpserts.push({
              menu_item_id: ins.id,
              dine_in_price: original._price,
              updated_at: new Date().toISOString()
            })
          }
        })
      }
    }

    // Bulk upsert pricing
    if (priceUpserts.length > 0) {
      for (let i = 0; i < priceUpserts.length; i += 50) {
        const chunk = priceUpserts.slice(i, i + 50)
        await supabase.from('costing_item_pricing').upsert(chunk, { onConflict: 'menu_item_id' })
      }
    }

    return NextResponse.json({
      success: true,
      synced: (posItems || []).length,
      pricesUpdated: priceUpserts.length,
      message: `Synchronized ${(posItems || []).length} items from POS & recipes with ${priceUpserts.length} active prices.`
    })
  } catch (err) {
    console.error('Batch sync POS error:', err)
    return NextResponse.json({ error: err.message || 'Failed to sync with POS' }, { status: 500 })
  }
}
