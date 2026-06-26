import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTaskAssignmentEmail } from '../../../../lib/email'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smaoazpzngwyuqbdghfn.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtYW9henB6bmd3eXVxYmRnaGZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0NzIyNiwiZXhwIjoyMDkxOTIzMjI2fQ.pRCFjvM2P-yzzkoh3fI7mJaCX4pXitusfAy2xbNhS_0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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

    // Send assignment email directly without localhost HTTP fetch
    if (staffData?.email) {
      try {
        await sendTaskAssignmentEmail({
          to: staffData.email,
          staffName: staffData.name,
          taskTitle: title,
          description: description || '',
          priority: priority || 'normal',
          dueDate: due_date || null
        })
      } catch (err) {
        console.error('Failed to send task assignment email:', err)
      }
    }

    return NextResponse.json({ success: true, task: data })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
