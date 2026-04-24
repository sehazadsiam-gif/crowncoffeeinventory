import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('name')
      .eq('is_active', true)
      .order('name')

    const data = (menuItems || []).map(item => ({
      'Item Name': item.name,
      'Quantity': 0
    }))

    // If no items, add a sample
    if (data.length === 0) {
      data.push({ 'Item Name': 'Cappuccino', 'Quantity': 10 })
    }

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Template')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=sales_template.xlsx'
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
