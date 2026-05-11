export const dynamic = 'force-dynamic'

import { supabase } from '../../../../lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, designation, designation_editable, is_active, base_salary')
      .order('name', { ascending: true })

    if (error) throw error

    // Handle case where UI expects full_name
    const formattedStaff = data.map(s => ({
      ...s,
      full_name: s.name
    }))

    return new Response(JSON.stringify({ staff: formattedStaff }), { status: 200 })
  } catch (error) {
    console.error('Fetch error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
