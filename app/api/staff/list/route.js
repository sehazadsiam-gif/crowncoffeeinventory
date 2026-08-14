import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const rosteredOnly = searchParams.get('rostered_only') === 'true'

    let query = supabaseAdmin
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .order('serial', { ascending: true })
      .order('name', { ascending: true })

    if (rosteredOnly) {
      query = query.eq('is_rostered', true)
    }

    const { data, error } = await query

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
