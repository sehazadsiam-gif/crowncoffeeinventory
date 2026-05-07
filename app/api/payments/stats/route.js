export const dynamic = 'force-dynamic'

import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const { data: balances } = await supabase
      .from('salary_balance')
      .select('*')
      .eq('month', month)
      .eq('year', year)

    const stats = {}
    balances?.forEach(b => {
      stats[b.staff_id] = {
        final_salary: b.final_salary,
        total_paid: b.total_paid,
        remaining_balance: b.remaining_balance
      }
    })

    return new Response(JSON.stringify({ stats }), { status: 200 })
  } catch (error) {
    console.error('Stats error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
