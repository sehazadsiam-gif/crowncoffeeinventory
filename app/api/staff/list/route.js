import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .order('serial', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('API /api/staff/list error:', error)
      return NextResponse.json({ error: error.message, staff: [] }, { status: 200 })
    }

    return NextResponse.json({ staff: data || [] }, { status: 200 })
  } catch (err) {
    console.error('API /api/staff/list server exception:', err)
    return NextResponse.json({ error: err.message, staff: [] }, { status: 200 })
  }
}
