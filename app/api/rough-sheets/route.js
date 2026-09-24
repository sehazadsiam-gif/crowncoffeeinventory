import { NextResponse } from 'next/server'
import { supabaseAdmin, supabase } from '../../../lib/supabase'

const client = supabaseAdmin || supabase

export async function GET() {
  try {
    const { data, error } = await client
      .from('rough_sheets')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      // If table doesn't exist yet, return friendly message so client uses local storage fallback
      console.warn('rough_sheets query warning:', error.message)
      return NextResponse.json({ 
        success: false, 
        warning: error.message, 
        data: [] 
      }, { status: 200 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('Failed to fetch rough_sheets:', err)
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { sheet, sheets } = body

    // Support single sheet upsert or batch save
    if (sheets && Array.isArray(sheets)) {
      const recordsToUpsert = sheets.map((s, idx) => ({
        ...(s.id ? { id: s.id } : {}),
        sheet_name: s.sheet_name || s.name || `Sheet ${idx + 1}`,
        columns: s.columns || [],
        data: s.data || [],
        styles: s.styles || {},
        sort_order: idx,
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await client
        .from('rough_sheets')
        .upsert(recordsToUpsert, { onConflict: 'id' })
        .select()

      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    if (sheet) {
      const record = {
        ...(sheet.id ? { id: sheet.id } : {}),
        sheet_name: sheet.sheet_name || sheet.name || 'Sheet 1',
        columns: sheet.columns || [],
        data: sheet.data || [],
        styles: sheet.styles || {},
        sort_order: sheet.sort_order ?? 0,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await client
        .from('rough_sheets')
        .upsert([record], { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'No sheet data provided' }, { status: 400 })
  } catch (err) {
    console.error('Failed to save rough sheet:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing sheet id' }, { status: 400 })
    }

    const { error } = await client
      .from('rough_sheets')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete sheet:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
