import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    const data = [
      {
        'Item Name': 'Cappuccino',
        'Category': 'Coffee',
        'Price': 220,
        'Ingredient': 'Espresso Beans',
        'Quantity': 18,
        'Unit': 'gm'
      },
      {
        'Item Name': 'Cappuccino',
        'Category': 'Coffee',
        'Price': 220,
        'Ingredient': 'Whole Milk',
        'Quantity': 120,
        'Unit': 'ml'
      },
      {
        'Item Name': 'Latte',
        'Category': 'Coffee',
        'Price': 250,
        'Ingredient': 'Espresso Beans',
        'Quantity': 18,
        'Unit': 'gm'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu Template')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=menu_template.xlsx'
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
