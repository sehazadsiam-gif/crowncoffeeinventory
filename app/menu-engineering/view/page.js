import { supabaseAdmin as supabase } from '../../../lib/supabase'
import ViewOnlyMenuEngineeringClient from './ViewOnlyMenuEngineeringClient'

export const metadata = {
  title: 'Menu Engineering & Costings (View Only) — Crown Coffee',
  description: 'View-only menu engineering, recipe costings, base costs, and margins for Crown Coffee.',
}

// Revalidate every 60 seconds or dynamic
export const revalidate = 60

export default async function ViewOnlyMenuEngineeringPage() {
  // Fetch all necessary data directly on the server
  const [
    { data: itemsRaw, error: itemsErr },
    { data: pricing, error: pricingErr },
    { data: channels, error: channelsErr },
    { data: channelPricing, error: cpErr },
    { data: ingredients, error: ingErr }
  ] = await Promise.all([
    supabase
      .from('costing_menu_items')
      .select('id, name, category, current_cogs')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('costing_item_pricing')
      .select('menu_item_id, dine_in_price'),
    supabase
      .from('costing_delivery_channels')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('costing_item_channel_pricing')
      .select('menu_item_id, channel_id, selling_price, commission_pct, discount_pct'),
    supabase
      .from('costing_item_ingredients')
      .select('menu_item_id, ingredient_name, quantity, unit, price, price_basis_unit, line_cost, sort_order')
      .order('sort_order')
  ])

  if (itemsErr) {
    console.error('Error fetching menu items:', itemsErr.message)
  }

  // Build lookups
  const pricingMap = new Map()
  ;(pricing || []).forEach(p => pricingMap.set(p.menu_item_id, p.dine_in_price))

  const channelPricingMap = new Map()
  ;(channelPricing || []).forEach(cp => {
    channelPricingMap.set(`${cp.menu_item_id}_${cp.channel_id}`, cp)
  })

  const ingredientsMap = new Map()
  ;(ingredients || []).forEach(row => {
    if (!ingredientsMap.has(row.menu_item_id)) {
      ingredientsMap.set(row.menu_item_id, [])
    }
    ingredientsMap.get(row.menu_item_id).push(row)
  })

  // Format items with combined pricing and recipes
  const items = (itemsRaw || []).map(item => {
    const channelPrices = {}
    ;(channels || []).forEach(ch => {
      const cp = channelPricingMap.get(`${item.id}_${ch.id}`)
      channelPrices[ch.id] = {
        selling_price: cp?.selling_price ?? 0,
        commission_pct: cp?.commission_pct ?? 0,
        discount_pct: cp?.discount_pct ?? 0
      }
    })

    return {
      id: item.id,
      name: item.name,
      category: item.category || 'General',
      current_cogs: parseFloat(item.current_cogs) || 0,
      dine_in_price: parseFloat(pricingMap.get(item.id)) || 0,
      channel_prices: channelPrices,
      recipe: ingredientsMap.get(item.id) || []
    }
  })

  return (
    <ViewOnlyMenuEngineeringClient
      initialItems={items}
      channels={channels || []}
    />
  )
}
