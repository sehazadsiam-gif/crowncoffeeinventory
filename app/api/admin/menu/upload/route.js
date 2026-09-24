import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../../lib/supabase'
import { requireRole } from '../../../../../lib/costing-auth'

/**
 * POST /api/admin/menu/upload
 * Accepts CSV file, CSV text, or JSON array of menu items with prices & cogs.
 * Format: [ { name: "Latte", category: "Coffee", price: 250, cogs: 65 }, ... ]
 */
export async function POST(request) {
  const { error: authErr, status } = await requireRole(request, 'admin')
  if (authErr) return NextResponse.json({ error: authErr }, { status })

  try {
    let itemsToProcess = []
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

      const text = await file.text()
      itemsToProcess = parseCSVToItems(text)
    } else {
      const body = await request.json()
      if (typeof body.csvText === 'string') {
        itemsToProcess = parseCSVToItems(body.csvText)
      } else if (Array.isArray(body.items)) {
        itemsToProcess = body.items
      } else {
        return NextResponse.json({ error: 'Invalid payload: expected items array or csvText' }, { status: 400 })
      }
    }

    if (!itemsToProcess.length) {
      return NextResponse.json({ error: 'No valid menu items found in upload' }, { status: 400 })
    }

    // 1. Fetch existing costing items and POS items in parallel
    const [cmiRes, posRes] = await Promise.all([
      supabase.from('costing_menu_items').select('id, name, category, current_cogs'),
      supabase.from('menu_items').select('id, name')
    ])

    const cmiMap = new Map()
    ;(cmiRes.data || []).forEach(item => {
      if (item.name) cmiMap.set(item.name.toLowerCase().trim(), item)
    })

    const posMap = new Map()
    ;(posRes.data || []).forEach(item => {
      if (item.name) posMap.set(item.name.toLowerCase().trim(), item)
    })

    const cmiInserts = []
    const cmiUpdates = []
    const priceUpserts = []
    const posUpserts = []

    for (const raw of itemsToProcess) {
      const name = String(raw.name || raw['Item Name'] || raw['item_name'] || raw.Item || '').trim()
      if (!name) continue

      const category = String(raw.category || raw.Category || 'General').trim()
      const price = parseFloat(raw.price ?? raw.Price ?? raw.selling_price ?? raw['Selling Price'] ?? raw['Dine In Price'] ?? raw['dine_in_price'] ?? 0) || 0
      const cogs = parseFloat(raw.cogs ?? raw.COGS ?? raw.cost ?? raw.Cost ?? raw.current_cogs ?? 0) || 0

      const existingCmi = cmiMap.get(name.toLowerCase())
      if (existingCmi) {
        cmiUpdates.push({
          id: existingCmi.id,
          name,
          category: category || existingCmi.category || 'General',
          current_cogs: cogs > 0 ? cogs : existingCmi.current_cogs || 0,
          is_active: true
        })
        priceUpserts.push({
          menu_item_id: existingCmi.id,
          dine_in_price: price,
          updated_at: new Date().toISOString()
        })
      } else {
        cmiInserts.push({
          name,
          category: category || 'General',
          current_cogs: cogs,
          is_active: true,
          _price: price
        })
      }

      // POS inventory table sync
      const existingPos = posMap.get(name.toLowerCase())
      posUpserts.push({
        ...(existingPos ? { id: existingPos.id } : {}),
        name,
        category: category || 'General',
        selling_price: price,
        is_active: true
      })
    }

    // 2. Execute bulk updates for existing costing items
    if (cmiUpdates.length > 0) {
      for (let i = 0; i < cmiUpdates.length; i += 50) {
        await supabase.from('costing_menu_items').upsert(cmiUpdates.slice(i, i + 50), { onConflict: 'id' })
      }
    }

    // 3. Execute bulk inserts for new costing items
    if (cmiInserts.length > 0) {
      const { data: inserted } = await supabase
        .from('costing_menu_items')
        .insert(cmiInserts.map(i => ({
          name: i.name,
          category: i.category,
          current_cogs: i.current_cogs,
          is_active: i.is_active
        })))
        .select('id, name')

      if (Array.isArray(inserted)) {
        inserted.forEach(ins => {
          const original = cmiInserts.find(x => x.name.toLowerCase() === ins.name.toLowerCase())
          if (original) {
            priceUpserts.push({
              menu_item_id: ins.id,
              dine_in_price: original._price,
              updated_at: new Date().toISOString()
            })
          }
        })
      }
    }

    // 4. Execute pricing upserts
    if (priceUpserts.length > 0) {
      for (let i = 0; i < priceUpserts.length; i += 50) {
        await supabase.from('costing_item_pricing').upsert(priceUpserts.slice(i, i + 50), { onConflict: 'menu_item_id' })
      }
    }

    // 5. Execute POS menu_items upserts
    if (posUpserts.length > 0) {
      for (let i = 0; i < posUpserts.length; i += 50) {
        await supabase.from('menu_items').upsert(posUpserts.slice(i, i + 50), { onConflict: 'name' })
      }
    }

    return NextResponse.json({
      success: true,
      total: itemsToProcess.length,
      created: cmiInserts.length,
      updated: cmiUpdates.length
    })
  } catch (err) {
    console.error('Upload menu error:', err)
    return NextResponse.json({ error: err.message || 'Failed to process menu upload' }, { status: 500 })
  }
}

// GET template download helper
export async function GET() {
  const sampleCSV = `Item Name,Category,Price,Cost
Espresso,Coffee,150,45
Cappuccino,Coffee,220,60
Caffè Latte,Coffee,250,70
Americano,Coffee,180,35
Flat White,Coffee,240,65
Mocha,Coffee,260,80
Cold Brew,Cold Brew & Tea,220,50
Masala Chai,Cold Brew & Tea,80,25
BBQ Chicken Pizza,Pizza,650,220
Beef Bolognese Pasta,Pasta,450,150
Chicken Sandwich,Sandwich,280,95
Traditional Breakfast,Breakfast,380,120`

  return new Response(sampleCSV, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="crown_coffee_menu_template.csv"'
    }
  })
}

function parseCSVToItems(text) {
  if (!text) return []
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = splitCSVRow(lines[0]).map(h => h.toLowerCase().trim().replace(/['"]/g, ''))
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('item'))
  const catIdx  = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('group'))
  const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('rate') || h.includes('sp'))
  const costIdx  = headers.findIndex(h => h.includes('cost') || h.includes('cogs') || h.includes('cp'))

  const items = []
  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVRow(lines[i])
    if (!row || row.length === 0) continue

    const name = nameIdx >= 0 ? row[nameIdx] : row[0]
    if (!name || !name.trim()) continue

    const category = catIdx >= 0 && row[catIdx] ? row[catIdx].trim() : 'General'
    const price = priceIdx >= 0 && row[priceIdx] ? parseFloat(row[priceIdx].replace(/[^0-9.]/g, '')) || 0 : 0
    const cogs  = costIdx >= 0 && row[costIdx] ? parseFloat(row[costIdx].replace(/[^0-9.]/g, '')) || 0 : 0

    items.push({ name: name.trim(), category, price, cogs })
  }

  return items
}

function splitCSVRow(row) {
  const result = []
  let insideQuote = false
  let current = ''

  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"' || char === "'") {
      insideQuote = !insideQuote
    } else if (char === ',' && !insideQuote) {
      result.push(current.trim().replace(/^["']|["']$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''))
  return result
}
