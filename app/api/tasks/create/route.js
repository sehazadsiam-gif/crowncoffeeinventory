import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { staff_id, title, description, priority, due_date } = body

    if (!staff_id || !title) {
      return NextResponse.json({ error: 'staff_id and title are required' }, { status: 400 })
    }

    const { data, error } = await supabase.from('staff_tasks').insert([{
      staff_id, title, description: description || null,
      priority: priority || 'normal',
      due_date: due_date || null,
      status: 'pending'
    }]).select().single()

    if (error) throw error

    // Fetch staff email for notification
    const { data: staffData } = await supabase.from('staff').select('name, email').eq('id', staff_id).single()

    // Send assignment email to staff if they have an email
    if (staffData?.email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task_assigned',
            staffName: staffData.name,
            to: staffData.email,
            taskTitle: title,
            description: description || '',
            priority: priority || 'normal',
            dueDate: due_date || null
          })
        })
      } catch {}
    }

    return NextResponse.json({ success: true, task: data })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
