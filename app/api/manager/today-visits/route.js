export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'manager' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')

    let targetDate = new Date()
    if (dateParam) {
      targetDate = new Date(dateParam)
    }

    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const targetDateOnly = `${year}-${month}-${day}`

    const { data, error } = await supabase
      .from('member_visits')
      .select(`
        visited_at,
        members (
          full_name,
          card_number,
          tier,
          total_visits
        )
      `)
      .gte('visited_at', targetDateOnly + 'T00:00:00')
      .lte('visited_at', targetDateOnly + 'T23:59:59')
      .order('visited_at', { ascending: false })

    if (error) {
      console.error('Fetch today visits error:', error)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

    const formatted = data.map(v => ({
      visited_at: v.visited_at,
      full_name: v.members?.full_name || 'Unknown',
      card_number: v.members?.card_number || 'N/A',
      tier: v.members?.tier || 'silver',
      total_visits: v.members?.total_visits || 0
    }))

    return NextResponse.json({ visits: formatted })
  } catch (error) {
    console.error('Today visits API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
