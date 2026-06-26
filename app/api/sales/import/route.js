import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseDocumentWithGemini } from '../../../../lib/gemini'

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
    const mimeType = file.type || 'application/pdf'

    // Define response schema for sales report
    const responseSchema = {
      type: 'object',
      properties: {
        sales: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the menu item sold' },
              quantity: { type: 'integer', description: 'Total quantity sold (integer)' }
            },
            required: ['name', 'quantity']
          }
        }
      },
      required: ['sales']
    }

    const prompt = `
      You are an expert sales parser.
      Analyze the attached PDF or CSV sales report from an external POS system.
      Extract each menu item sold and the corresponding total quantity sold on that day.
      Clean up item names to match typical cafe menu naming conventions if necessary.
    `

    const parsedData = await parseDocumentWithGemini(bytes, mimeType, prompt, responseSchema)
    const extractedSales = parsedData.sales || []

    // Fetch all active menu items for client-side/preview mapping
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name, selling_price')
      .eq('is_active', true)

    // Map extracted items to existing menu items
    const processedSales = extractedSales.map(sale => {
      const match = menuItems.find(m => 
        m.name.toLowerCase() === sale.name.toLowerCase() ||
        m.name.toLowerCase().includes(sale.name.toLowerCase()) ||
        sale.name.toLowerCase().includes(m.name.toLowerCase())
      )

      return {
        name: sale.name,
        quantity: sale.quantity,
        menu_item_id: match ? match.id : null,
        matched_name: match ? match.name : null,
        price: match ? match.selling_price : 0,
        unmatched: !match
      }
    })

    return NextResponse.json({
      success: true,
      sales: processedSales,
      date
    })
  } catch (error) {
    console.error('Sales import parse error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT to save daily sales records
export async function PUT(req) {
  try {
    const { sales, date } = await req.json()
    if (!sales || !Array.isArray(sales)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const toInsert = []
    let skippedCount = 0

    for (const item of sales) {
      if (!item.menu_item_id) {
        skippedCount++
        continue
      }

      toInsert.push({
        date: date || new Date().toISOString().split('T')[0],
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        total_revenue: item.quantity * item.price
      })
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('sales').insert(toInsert)
      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      imported: toInsert.length,
      skipped: skippedCount
    })
  } catch (error) {
    console.error('Sales import save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
