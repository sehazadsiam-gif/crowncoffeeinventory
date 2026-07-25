import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checklist/equipment?month=7&year=2026
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())

    const { data, error } = await supabaseAdmin
      .from('equipment_checklist')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/checklist/equipment] DB Error:', error.message)
      // Return empty list if table not initialized yet
      return NextResponse.json({ items: [], month, year, error: error.message })
    }

    return NextResponse.json({ items: data || [], month, year })
  } catch (err) {
    console.error('[GET /api/checklist/equipment]', err)
    return NextResponse.json({ items: [], error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/checklist/equipment
 * Body: { item_name, quantity, price?, month, year, status?, notes? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { item_name, quantity, price, month, year, status = 'working', notes } = body

    if (!item_name || !item_name.trim()) {
      return NextResponse.json({ error: 'Item Name is required' }, { status: 400 })
    }
    if (!quantity || Number(quantity) < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }
    if (!month || !year) {
      return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 })
    }

    const newItem = {
      item_name: String(item_name).trim(),
      quantity: parseInt(quantity, 10),
      price: price !== undefined && price !== null && price !== '' ? parseFloat(price) : null,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      status: status || 'working',
      notes: notes ? String(notes).trim() : null,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('equipment_checklist')
      .insert(newItem)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, item: data, message: 'Equipment item added successfully' })
  } catch (err) {
    console.error('[POST /api/checklist/equipment]', err)
    return NextResponse.json({ error: err.message || 'Failed to add equipment item' }, { status: 500 })
  }
}

/**
 * PUT /api/checklist/equipment
 * Body: { id, item_name?, quantity?, price?, status?, notes?, action_pin? }
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, item_name, quantity, price, status, notes, action_pin } = body

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    if (action_pin !== undefined && String(action_pin).trim() !== '1590') {
      return NextResponse.json({ error: 'Invalid Edit/Delete Security PIN' }, { status: 401 })
    }

    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (item_name !== undefined) updateData.item_name = String(item_name).trim()
    if (quantity !== undefined) updateData.quantity = parseInt(quantity, 10)
    if (price !== undefined) updateData.price = price !== null && price !== '' ? parseFloat(price) : null
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null

    const { data, error } = await supabaseAdmin
      .from('equipment_checklist')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, item: data, message: 'Equipment item updated successfully' })
  } catch (err) {
    console.error('[PUT /api/checklist/equipment]', err)
    return NextResponse.json({ error: err.message || 'Failed to update equipment item' }, { status: 500 })
  }
}

/**
 * DELETE /api/checklist/equipment?id=...&action_pin=1590
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const actionPin = searchParams.get('action_pin') || request.headers.get('x-action-pin')

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    if (actionPin && String(actionPin).trim() !== '1590') {
      return NextResponse.json({ error: 'Invalid Edit/Delete Security PIN' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('equipment_checklist')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Equipment item deleted successfully' })
  } catch (err) {
    console.error('[DELETE /api/checklist/equipment]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete equipment item' }, { status: 500 })
  }
}
