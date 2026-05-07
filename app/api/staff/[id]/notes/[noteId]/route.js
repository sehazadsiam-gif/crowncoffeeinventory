export const dynamic = 'force-dynamic'

import { supabase } from '../../../../../../lib/supabase'
import { verifyAdminAuth } from '../../../../../../lib/auth'

export async function DELETE(request, { params }) {
  try {
    const isAuthorized = await verifyAdminAuth(request)
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { noteId } = params

    const { error } = await supabase
      .from('staff_notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Delete error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
