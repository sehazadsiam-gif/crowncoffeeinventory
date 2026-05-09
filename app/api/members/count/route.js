export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { unstable_noStore as noStore } from 'next/cache'

export async function GET() {
  noStore()
  try {
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (error) {
      console.error('Member count error:', error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Member count error:', error)
    return NextResponse.json({ count: 0 })
  }
}
