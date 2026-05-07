export const dynamic = 'force-dynamic'

import { supabase } from '../../../../lib/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = params

    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Handle case where some records might use name and some full_name
    const formattedStaff = {
      ...data,
      full_name: data.full_name || data.name
    }

    return new Response(JSON.stringify({ staff: formattedStaff }), { status: 200 })
  } catch (error) {
    console.error('Fetch error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
