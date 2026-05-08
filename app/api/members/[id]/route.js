export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'

export async function GET(request, { params }) {
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
      .eq('id', params.id)

    if (error) throw error

    const member = members?.[0]
    if (!member) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, member }, { status: 200 })
  } catch (error) {
    console.error('Get member error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
