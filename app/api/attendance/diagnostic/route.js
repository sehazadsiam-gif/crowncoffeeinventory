export const dynamic = 'force-dynamic'

import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return new Response(JSON.stringify({ error: 'Month and year are required' }), { status: 400 })
    }

    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('*, staff(full_name)')
      .eq('month', month)
      .eq('year', year)
      .order('date', { ascending: true })

    if (error) throw error

    const formatted = attendance.map(a => ({
      ...a,
      staff_name: a.staff?.full_name || 'Unknown'
    }))

    return new Response(JSON.stringify({ attendance: formatted }), { status: 200 })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
