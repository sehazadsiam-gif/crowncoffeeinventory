import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

// GET /api/admin/channels
export async function GET(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { data, error: dbErr } = await supabase
    .from('costing_delivery_channels')
    .select('id, name, is_active, sort_order')
    .order('sort_order')

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/channels  — create new channel
export async function POST(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { name, sort_order } = await request.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_delivery_channels')
    .insert({ name: name.trim(), sort_order: sort_order ?? 99 })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/channels  — rename or toggle active
export async function PATCH(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { id, name, is_active, sort_order } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const upd = {}
  if (name !== undefined)      upd.name = name.trim()
  if (is_active !== undefined) upd.is_active = is_active
  if (sort_order !== undefined) upd.sort_order = sort_order

  const { data, error: dbErr } = await supabase
    .from('costing_delivery_channels')
    .update(upd)
    .eq('id', id)
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/channels?id=<uuid>
export async function DELETE(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error: dbErr } = await supabase
    .from('costing_delivery_channels')
    .delete()
    .eq('id', id)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
