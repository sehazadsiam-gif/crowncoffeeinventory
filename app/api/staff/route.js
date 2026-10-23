import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { verifyAdminRequest } from '../../../lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const auth = await verifyAdminRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .order('serial', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('API /api/staff error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] }, { status: 200 })
  } catch (err) {
    console.error('API /api/staff server exception:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
