import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('staff_remarks')
      .select('*')
      .eq('staff_id', session.staffId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ remarks: data })
  } catch (error) {
    console.error('Fetch remarks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
