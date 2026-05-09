export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('members')
      .select('id, full_name, email, phone, date_of_birth, status, tier, total_visits')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json({ members: data })
  } catch (error) {
    console.error('Fetch special offers members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
