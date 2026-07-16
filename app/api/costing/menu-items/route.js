import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

// GET /api/costing/menu-items?search=<text>&all=true
export async function GET(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const all    = searchParams.get('all') === 'true'

  let query = supabase
    .from('costing_menu_items')
    .select('id, name, category, is_active, current_cogs, created_at, updated_at')
    .order('name')

  if (!all) query = query.eq('is_active', true)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/costing/menu-items
export async function POST(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { name, category } = body
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_menu_items')
    .upsert({ name: name.trim(), category: category?.trim() || null }, { onConflict: 'name' })
    .select('id, name, category, current_cogs')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/costing/menu-items  (update category / is_active)
export async function PATCH(request) {
  const { error, status } = await requireRole(request, 'chef', 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const allowed = {}
  if (updates.category !== undefined) allowed.category = updates.category
  if (updates.is_active !== undefined) allowed.is_active = updates.is_active

  const { data, error: dbErr } = await supabase
    .from('costing_menu_items')
    .update(allowed)
    .eq('id', id)
    .select('id, name, category, is_active, current_cogs')
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}
