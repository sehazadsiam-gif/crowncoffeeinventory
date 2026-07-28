export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { unstable_noStore as noStore } from 'next/cache'

export async function GET(request) {
  noStore()
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(
      { success: true, members: members || [] },
      { status: 200 }
    )
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
