export const dynamic = 'force-dynamic'

import { supabase } from '../../../../lib/supabase'
import { verifyAdminAuth } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const isAuthorized = await verifyAdminAuth(request)
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { month, year, total_amount, distribution_method, allocations } = await request.json()

    const { data: distData, error: distError } = await supabase
      .from('service_charge_distribution')
      .insert([{
        month,
        year,
        total_amount,
        distribution_method
      }])
      .select()

    if (distError) throw distError

    const distribution_id = distData[0].id

    const allocationRows = allocations.map(a => ({
      distribution_id,
      staff_id: a.staff_id,
      amount: a.amount
    }))

    const { error: allocError } = await supabase
      .from('service_charge_allocation')
      .insert(allocationRows)

    if (allocError) throw allocError

    for (const alloc of allocations) {
      const { data: payroll } = await supabase
        .from('payroll_entries')
        .select('id, service_charge')
        .eq('staff_id', alloc.staff_id)
        .eq('month', month)
        .eq('year', year)
        .single()

      if (payroll) {
        const newServiceCharge = (payroll.service_charge || 0) + alloc.amount
        await supabase
          .from('payroll_entries')
          .update({ service_charge: newServiceCharge })
          .eq('id', payroll.id)
      }
    }

    return new Response(JSON.stringify({ success: true, distribution_id }), { status: 200 })
  } catch (error) {
    console.error('Distribution error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
