import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smaoazpzngwyuqbdghfn.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtYW9henB6bmd3eXVxYmRnaGZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0NzIyNiwiZXhwIjoyMDkxOTIzMjI2fQ.pRCFjvM2P-yzzkoh3fI7mJaCX4pXitusfAy2xbNhS_0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')
    const status = searchParams.get('status')

    let query = supabase.from('staff_tasks').select('*, staff(id, name, designation)').order('created_at', { ascending: false })

    if (staffId) query = query.eq('staff_id', staffId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ tasks: data || [] })
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')
    if (!taskId) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase.from('staff_tasks').delete().eq('id', taskId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
