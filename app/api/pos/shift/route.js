import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    let query = supabase.from('pos_shifts').select('*, opened_by(name)').order('opened_at', { ascending: false })

    if (active === 'true') {
      query = query.eq('status', 'open').limit(1)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ shifts: data || [] })
  } catch (error) {
    console.error('List shifts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, opened_by, opening_float, closing_cash, actual_cash, card_total, mobile_total, notes, shift_id } = body

    if (action === 'open') {
      const { data, error } = await supabase.from('pos_shifts').insert([{
        opened_by,
        opening_float: parseFloat(opening_float) || 0,
        status: 'open'
      }]).select().single()

      if (error) throw error
      return NextResponse.json({ success: true, shift: data })
    } 
    
    if (action === 'close') {
      if (!shift_id) return NextResponse.json({ error: 'shift_id is required for closing' }, { status: 400 })

      const { data, error } = await supabase.from('pos_shifts')
        .update({
          closed_at: new Date().toISOString(),
          closing_cash: parseFloat(closing_cash) || 0,
          actual_cash: parseFloat(actual_cash) || 0,
          card_total: parseFloat(card_total) || 0,
          mobile_total: parseFloat(mobile_total) || 0,
          notes: notes || '',
          status: 'closed'
        })
        .eq('id', shift_id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, shift: data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('POS shift action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
