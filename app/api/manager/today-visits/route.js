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

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('member_visits')
      .select(`
        visited_at,
        members (
          full_name,
          card_number,
          tier
        )
      `)
      .gte('visited_at', today + 'T00:00:00')
      .lte('visited_at', today + 'T23:59:59')
      .order('visited_at', { ascending: false })

    if (error) {
      console.error('Fetch today visits error:', error)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

    const formatted = data.map(v => ({
      visited_at: v.visited_at,
      full_name: v.members.full_name,
      card_number: v.members.card_number,
      tier: v.members.tier
    }))

    return NextResponse.json({ visits: formatted })
  } catch (error) {
    console.error('Today visits API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
