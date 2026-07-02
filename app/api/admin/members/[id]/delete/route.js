export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../../lib/supabase'
import { validateSession } from '../../../../../../lib/auth'

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { action } = await request.json()

    let updateData = {}
    if (action === 'deactivate') {
      updateData = { status: 'deactivated' }
    } else if (action === 'delete') {
      updateData = { status: 'deleted' }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json(
      { success: true, message: `Member ${action === 'delete' ? 'deleted' : 'deactivated'} successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error('Admin member action error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
