import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { validateSession } from '../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'manager' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('members')
      .select('id, full_name, card_number, tier, total_visits, punch_count, email, phone')
      .eq('status', 'active')
      .or(`full_name.ilike.%${q}%,card_number.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20)

    if (error) {
      console.error('Search members error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
