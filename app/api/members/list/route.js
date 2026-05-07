export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(
      { success: true, members: members || [] },
      { status: 200 }
    )
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
