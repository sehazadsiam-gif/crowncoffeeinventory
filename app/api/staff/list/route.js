export const dynamic = 'force-dynamic'

import { supabase } from '../../../lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, full_name, designation, designation_editable, is_active')
      .order('name', { ascending: true })

    if (error) throw error

    // Handle case where some records might use name and some full_name
    const formattedStaff = data.map(s => ({
      ...s,
      full_name: s.full_name || s.name
    }))

    return new Response(JSON.stringify({ staff: formattedStaff }), { status: 200 })
  } catch (error) {
    console.error('Fetch error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
