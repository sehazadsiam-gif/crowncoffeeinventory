export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No auth' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching pending members...')

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Found pending members:', members?.length || 0)

    return NextResponse.json({
      success: true,
      members: members || []
    }, { status: 200 })

  } catch (error) {
    console.error('Pending API error:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
