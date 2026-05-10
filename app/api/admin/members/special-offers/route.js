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

    // Fetch members
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, email, phone, date_of_birth, status, tier, total_visits')
      .eq('status', 'active')

    if (memberError) throw memberError

    // Fetch all special dates
    const { data: specialDates, error: dateError } = await supabase
      .from('member_special_dates')
      .select('*')

    if (dateError) throw dateError

    // Combine them
    const combined = members.map(m => ({
      ...m,
      custom_special_dates: specialDates.filter(d => d.member_id === m.id)
    }))

    return NextResponse.json({ members: combined })
  } catch (error) {
    console.error('Fetch special offers members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
