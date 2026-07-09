import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Helper to get start and end dates of a month
function getMonthDateRange(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]
  return { startDate, endDate }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month'))
    const year = parseInt(searchParams.get('year'))

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const { startDate, endDate } = getMonthDateRange(month, year)

    // 1. Fetch dynamic purchases (bazar total cost)
    const { data: bazarData, error: bazarError } = await supabase
      .from('bazar_entries')
      .select('total_cost')
      .gte('date', startDate)
      .lte('date', endDate)
    
    if (bazarError) throw bazarError
    const totalPurchases = bazarData?.reduce((s, r) => s + (Number(r.total_cost) || 0), 0) || 0

    // 2. Fetch dynamic sales (total revenue)
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('total_revenue')
      .gte('date', startDate)
      .lte('date', endDate)
    
    if (salesError) throw salesError
    const totalSales = salesData?.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0) || 0

    // 3. Fetch audit record
    const { data: audit, error: auditError } = await supabase
      .from('inventory_audits')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (auditError) throw auditError

    if (!audit) {
      // No audit exists yet
      // Fetch current ingredients to preview what will be audited
      const { data: ingredients, error: ingError } = await supabase
        .from('ingredients')
        .select('id, name, unit, current_stock, cost_per_unit')
        .order('name')
      
      if (ingError) throw ingError

      return NextResponse.json({
        exists: false,
        totalPurchases,
        totalSales,
        ingredients: ingredients || []
      })
    }

    // Audit exists, fetch its items
    const { data: auditItems, error: itemsError } = await supabase
      .from('inventory_audit_items')
      .select('*, ingredients(name, unit)')
      .eq('audit_id', audit.id)

    if (itemsError) throw itemsError

    // If audit is open, we also fetch the current live stocks in case we want to show/compare them
    let liveIngredients = []
    if (audit.status === 'open') {
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, current_stock, cost_per_unit')
      liveIngredients = ingredients || []
    }

    return NextResponse.json({
      exists: true,
      audit,
      items: auditItems || [],
      liveIngredients,
      totalPurchases: audit.status === 'closed' ? audit.total_purchases_value : totalPurchases,
      totalSales: audit.status === 'closed' ? audit.total_sales_value : totalSales
    })

  } catch (error) {
    console.error('Error fetching inventory audit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { month, year } = await req.json()

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    // Check if audit already exists
    const { data: existing } = await supabase
      .from('inventory_audits')
      .select('id')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An audit already exists for this month' }, { status: 400 })
    }

    // Fetch all current ingredients to snapshot opening stock
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('id, current_stock, cost_per_unit')
    
    if (ingError) throw ingError

    // Calculate total opening stock value
    const openingStockValue = ingredients?.reduce((s, i) => s + ((Number(i.current_stock) || 0) * (Number(i.cost_per_unit) || 0)), 0) || 0

    // Create the inventory audit
    const { data: newAudit, error: auditError } = await supabase
      .from('inventory_audits')
      .insert({
        month,
        year,
        opening_stock_value: openingStockValue,
        status: 'open'
      })
      .select()
      .single()

    if (auditError) throw auditError

    // Insert audit items snapshots
    if (ingredients && ingredients.length > 0) {
      const auditItems = ingredients.map(i => ({
        audit_id: newAudit.id,
        ingredient_id: i.id,
        opening_qty: i.current_stock || 0,
        opening_cost: i.cost_per_unit || 0
      }))

      const { error: itemsError } = await supabase
        .from('inventory_audit_items')
        .insert(auditItems)

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ success: true, audit: newAudit })

  } catch (error) {
    console.error('Error starting inventory audit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const { month, year, items } = await req.json()

    if (!month || !year || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload parameters' }, { status: 400 })
    }

    // 1. Fetch the open audit
    const { data: audit, error: auditError } = await supabase
      .from('inventory_audits')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .eq('status', 'open')
      .maybeSingle()

    if (auditError) throw auditError
    if (!audit) {
      return NextResponse.json({ error: 'No open audit found for this month' }, { status: 404 })
    }

    // 2. Fetch current ingredients to compute stock movement changes
    const { data: liveIngredients, error: ingError } = await supabase
      .from('ingredients')
      .select('id, current_stock')
    
    if (ingError) throw ingError
    const liveStockMap = new Map(liveIngredients.map(i => [i.id, Number(i.current_stock) || 0]))

    // 3. Process each audited item
    let closingStockValue = 0
    const movements = []

    for (const item of items) {
      const closingQty = Number(item.closing_qty) || 0
      const closingCost = Number(item.closing_cost) || 0
      closingStockValue += (closingQty * closingCost)

      // Update audit item details
      const { error: itemUpdateErr } = await supabase
        .from('inventory_audit_items')
        .update({
          closing_qty: closingQty,
          closing_cost: closingCost
        })
        .eq('audit_id', audit.id)
        .eq('ingredient_id', item.ingredient_id)

      if (itemUpdateErr) throw itemUpdateErr

      // Update actual ingredients table (overwrite existing stock levels)
      const { error: ingUpdateErr } = await supabase
        .from('ingredients')
        .update({
          current_stock: closingQty,
          cost_per_unit: closingCost
        })
        .eq('id', item.ingredient_id)

      if (ingUpdateErr) throw ingUpdateErr

      // Compute physical discrepancy difference to log movement audit trail
      const currentLiveQty = liveStockMap.get(item.ingredient_id) || 0
      const diff = closingQty - currentLiveQty

      movements.push({
        ingredient_id: item.ingredient_id,
        movement_type: 'manual_adjust',
        quantity: diff,
        notes: `Monthly audit adjustment (${month}/${year}). Overwrote stock to closing balance.`
      })
    }

    // Insert stock movements in bulk
    if (movements.length > 0) {
      const { error: movErr } = await supabase.from('stock_movements').insert(movements)
      if (movErr) throw movErr
    }

    // 4. Fetch dynamic purchases and sales to compute the final Monthly Bazar Ratio
    const { startDate, endDate } = getMonthDateRange(month, year)

    const { data: bazarData } = await supabase
      .from('bazar_entries')
      .select('total_cost')
      .gte('date', startDate)
      .lte('date', endDate)
    const totalPurchases = bazarData?.reduce((s, r) => s + (Number(r.total_cost) || 0), 0) || 0

    const { data: salesData } = await supabase
      .from('sales')
      .select('total_revenue')
      .gte('date', startDate)
      .lte('date', endDate)
    const totalSales = salesData?.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0) || 0

    // Ratio = (Opening Stock + Purchases - Closing Stock) / Total Sales
    const bazarRatio = totalSales > 0 ? (Number(audit.opening_stock_value) + totalPurchases - closingStockValue) / totalSales : 0

    // 5. Complete the audit
    const { error: finalUpdateErr } = await supabase
      .from('inventory_audits')
      .update({
        closing_stock_value: closingStockValue,
        total_purchases_value: totalPurchases,
        total_sales_value: totalSales,
        bazar_ratio: bazarRatio,
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', audit.id)

    if (finalUpdateErr) throw finalUpdateErr

    return NextResponse.json({ success: true, bazarRatio })

  } catch (error) {
    console.error('Error completing inventory audit:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
