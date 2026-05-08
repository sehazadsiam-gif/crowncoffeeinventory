export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      members: members || []
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
