import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const date = formData.get('date') || new Date().toISOString().split('T')[0]

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const workbook = XLSX.read(bytes, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // Fetch all active menu items for matching
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name, selling_price')
      .eq('is_active', true)

    const unmatched = []
    const toInsert = []

    for (const row of rows) {
      const itemName = row['Item Name'] || row['item_name'] || row['Item']
      const quantity = parseInt(row['Quantity'] || row['quantity'] || row['Qty'] || 0)

      if (!itemName || quantity <= 0) continue

      // Case-insensitive matching
      // Partial matching: see if itemName is contained in any menu item name or vice-versa
      const match = menuItems.find(m => 
        m.name.toLowerCase() === itemName.toString().toLowerCase() ||
        m.name.toLowerCase().includes(itemName.toString().toLowerCase()) ||
        itemName.toString().toLowerCase().includes(m.name.toLowerCase())
      )

      if (match) {
        toInsert.push({
          date,
          menu_item_id: match.id,
          quantity,
          total_revenue: quantity * match.selling_price
        })
      } else {
        unmatched.push(itemName)
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('sales').insert(toInsert)
      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      imported: toInsert.length,
      unmatched
    })
  } catch (error) {
    console.error('Sales import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
