export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('members')
      .select('id, full_name, email, phone, date_of_birth, address, occupation, status, tier, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Pending members found:', data?.length || 0)

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      members: data || [] 
    }, { status: 200 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
