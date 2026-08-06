import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())

    const { data, error } = await supabaseAdmin
      .from('payroll_entries')
      .select('*, staff:staff_id(id, name, base_salary, per_day_rate, per_hour_rate)')
      .eq('month', month)
      .eq('year', year)

    if (error) {
      console.error('API /api/payroll/list error:', error)
      return NextResponse.json({ error: error.message, payroll: [] }, { status: 200 })
    }

    return NextResponse.json({ payroll: data || [] }, { status: 200 })
  } catch (err) {
    console.error('API /api/payroll/list server exception:', err)
    return NextResponse.json({ error: err.message, payroll: [] }, { status: 200 })
  }
}
