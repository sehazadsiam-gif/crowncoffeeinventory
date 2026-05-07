export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const { error } = await supabase
      .from('members')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json(
      { success: true, message: 'Member rejected' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reject error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
