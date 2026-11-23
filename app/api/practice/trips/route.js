import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET /api/practice/trips  — list all trips
export async function GET() {
  const { data, error } = await supabase
    .from('practice_bazar_trips')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trips: data })
}

// POST /api/practice/trips  — create new trip
export async function POST(req) {
  try {
    const { created_by } = await req.json()
    const { data, error } = await supabase
      .from('practice_bazar_trips')
      .insert({ status: 'open', created_by: created_by || 'staff' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ trip: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
