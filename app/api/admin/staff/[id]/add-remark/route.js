import { NextResponse } from 'next/server'
import { supabase } from '../../../../../../lib/supabase'
import { validateSession } from '../../../../../../lib/auth'

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staff_id = params.id
    const { remark_text } = await request.json()

    if (!remark_text) {
      return NextResponse.json({ error: 'Remark text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('staff_remarks')
      .insert([
        { 
          staff_id, 
          admin_id: session.userId, 
          remark_text, 
          created_by_name: 'Admin' 
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, remark_id: data[0].id })
  } catch (error) {
    console.error('Add remark error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
