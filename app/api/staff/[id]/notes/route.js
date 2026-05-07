export const dynamic = 'force-dynamic'

import { supabase } from '../../../../../lib/supabase'
import { verifyAdminAuth } from '../../../../../lib/auth'

export async function POST(request, { params }) {
  try {
    const isAuthorized = await verifyAdminAuth(request)
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { id: staff_id } = params
    const { note_type, title, content, date_noted, visible_to_staff } = await request.json()

    const { data, error } = await supabase
      .from('staff_notes')
      .insert([{
        staff_id,
        note_type,
        title,
        content,
        date_noted,
        visible_to_staff,
        created_by: 'Admin'
      }])
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, note: data[0] }), { status: 200 })
  } catch (error) {
    console.error('Note error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const { id: staff_id } = params

    const { data, error } = await supabase
      .from('staff_notes')
      .select('*')
      .eq('staff_id', staff_id)
      .order('date_noted', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify({ notes: data }), { status: 200 })
  } catch (error) {
    console.error('Fetch error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
