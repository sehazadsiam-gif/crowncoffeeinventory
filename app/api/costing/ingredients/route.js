import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

// GET /api/costing/ingredients?search=<text>
export async function GET(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  let query = supabase
    .from('costing_ingredients')
    .select('id, name')
    .order('name')
    .limit(30)

  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/costing/ingredients  (create or return existing)
export async function POST(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { name } = await request.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_ingredients')
    .upsert({ name: name.trim() }, { onConflict: 'name' })
    .select('id, name')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}
