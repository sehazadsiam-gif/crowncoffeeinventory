import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTaskStatusUpdateEmail } from '../../../../lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { task_id, status, staff_note } = body

    if (!task_id || !status) {
      return NextResponse.json({ error: 'task_id and status are required' }, { status: 400 })
    }

    const { data, error } = await supabase.from('staff_tasks')
      .update({ status, staff_note: staff_note || null, updated_at: new Date().toISOString() })
      .eq('id', task_id)
      .select('*, staff(name, email)')
      .single()

    if (error) throw error

    // Notify admin via email directly
    try {
      await sendTaskStatusUpdateEmail({
        staffName: data.staff?.name || 'Staff',
        taskTitle: data.title,
        status,
        staffNote: staff_note || ''
      })
    } catch (err) {
      console.error('Failed to send status update email to admin:', err)
    }

    return NextResponse.json({ success: true, task: data })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
