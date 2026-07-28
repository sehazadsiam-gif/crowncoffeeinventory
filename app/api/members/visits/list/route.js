import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req) {
  noStore()
  try {
    const { searchParams } = new URL(req.url)
    const targetDateStr = searchParams.get('date') // Format: YYYY-MM-DD or empty for today

    let startDate, endDate

    if (targetDateStr) {
      startDate = new Date(`${targetDateStr}T00:00:00.000Z`)
      endDate = new Date(`${targetDateStr}T23:59:59.999Z`)
    } else {
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    const { data: visits, error } = await supabase
      .from('member_visits')
      .select('*, members(id, full_name, email, phone, card_number, rfid_code, total_visits, visit_punch_count, free_coffee_rewards_available)')
      .gte('visited_at', startDate.toISOString())
      .lte('visited_at', endDate.toISOString())
      .order('visited_at', { ascending: false })

    if (error) {
      console.error('Fetch visits error:', error)
      return NextResponse.json({ success: false, visits: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      date: targetDateStr || startDate.toISOString().split('T')[0],
      total_count: visits?.length || 0,
      visits: visits || []
    })
  } catch (err) {
    console.error('GET Visits List API Error:', err)
    return NextResponse.json({ success: false, visits: [], error: err.message }, { status: 500 })
  }
}
