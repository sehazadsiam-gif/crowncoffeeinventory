export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('id, full_name, email, phone, tier, total_visits, punch_count, visit_punch_count, free_coffee_rewards_available, status, card_number, member_since')
      .eq('status', 'active')
      .order('total_visits', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, members: members || [] }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
