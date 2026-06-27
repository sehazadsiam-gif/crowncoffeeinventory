import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTaskStatusUpdateEmail } from '../../../../lib/email'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smaoazpzngwyuqbdghfn.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtYW9henB6bmd3eXVxYmRnaGZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0NzIyNiwiZXhwIjoyMDkxOTIzMjI2fQ.pRCFjvM2P-yzzkoh3fI7mJaCX4pXitusfAy2xbNhS_0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

export async function POST(request) {
  try {
    const body = await request.json()
    const { task_id, status, staff_note, is_verified } = body

    if (!task_id || !status) {
      return NextResponse.json({ error: 'task_id and status are required' }, { status: 400 })
    }

    const updateFields = { status, updated_at: new Date().toISOString() }
    if (staff_note !== undefined) {
      updateFields.staff_note = staff_note || null
    }
    if (is_verified !== undefined) {
      updateFields.is_verified = is_verified
    }

    const { data, error } = await supabase.from('staff_tasks')
      .update(updateFields)
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
