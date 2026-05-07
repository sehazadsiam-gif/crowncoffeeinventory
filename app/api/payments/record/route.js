export const dynamic = 'force-dynamic'

import { supabase } from '../../../../lib/supabase'
import { verifyAdminAuth } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const isAuthorized = await verifyAdminAuth(request)
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { staff_id, month, year, amount, payment_date, payment_method, notes } = await request.json()

    const { error: payError } = await supabase
      .from('salary_payments')
      .insert([{
        staff_id,
        month,
        year,
        amount,
        payment_date,
        payment_method,
        notes
      }])

    if (payError) throw payError

    const { data: balance } = await supabase
      .from('salary_balance')
      .select('*')
      .eq('staff_id', staff_id)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (balance) {
      const newPaid = (balance.total_paid || 0) + amount
      const newRemaining = balance.final_salary - newPaid

      await supabase
        .from('salary_balance')
        .update({
          total_paid: newPaid,
          remaining_balance: Math.max(0, newRemaining)
        })
        .eq('id', balance.id)
    } else {
      const { data: payroll } = await supabase
        .from('payroll_entries')
        .select('final_salary')
        .eq('staff_id', staff_id)
        .eq('month', month)
        .eq('year', year)
        .single()

      if (payroll) {
        const newRemaining = payroll.final_salary - amount

        await supabase
          .from('salary_balance')
          .insert([{
            staff_id,
            month,
            year,
            final_salary: payroll.final_salary,
            total_paid: amount,
            remaining_balance: Math.max(0, newRemaining)
          }])
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Payment error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
