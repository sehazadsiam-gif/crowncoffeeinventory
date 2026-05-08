export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request, context) {
  try {
    const id = context?.params?.id
    if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 })

    const { error } = await supabase
      .from('members')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
