export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    console.log('Fetching pending members...')

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    console.log('Query result:', { count: data?.length, error })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      members: data || [] 
    }, { status: 200 })

  } catch (error) {
    console.error('Pending API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
