import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requireRole } from '../../../../lib/costing-auth'

// GET /api/admin/fixed-costs?year=2025&month=7  (single month)
// GET /api/admin/fixed-costs?fromYear=2025&fromMonth=1&toYear=2025&toMonth=12  (range for trend)
export async function GET(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const { searchParams } = new URL(request.url)
  const year      = searchParams.get('year')
  const month     = searchParams.get('month')
  const fromYear  = searchParams.get('fromYear')
  const fromMonth = searchParams.get('fromMonth')
  const toYear    = searchParams.get('toYear')
  const toMonth   = searchParams.get('toMonth')

  let query = supabase
    .from('costing_fixed_costs_monthly')
    .select('id, year, month, rent, salaries, utilities, other_overhead, notes, updated_at')

  if (year && month) {
    query = query.eq('year', parseInt(year)).eq('month', parseInt(month))
  } else if (fromYear && fromMonth && toYear && toMonth) {
    // Fetch range: convert to numeric YYYYMM for comparison
    query = query
      .gte('year', parseInt(fromYear))
      .lte('year', parseInt(toYear))
      .order('year').order('month')
    // Client-side filter for month boundaries handled by client
  } else {
    query = query.order('year', { ascending: false }).order('month', { ascending: false }).limit(12)
  }

  const { data, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/fixed-costs  — upsert fixed costs for a month
export async function POST(request) {
  const { error, status } = await requireRole(request, 'admin')
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { year, month, rent, salaries, utilities, other_overhead, notes } = body

  if (!year || !month) return NextResponse.json({ error: 'year and month required' }, { status: 400 })

  const { data, error: dbErr } = await supabase
    .from('costing_fixed_costs_monthly')
    .upsert({
      year:          parseInt(year),
      month:         parseInt(month),
      rent:          parseFloat(rent)          || 0,
      salaries:      parseFloat(salaries)      || 0,
      utilities:     parseFloat(utilities)     || 0,
      other_overhead: parseFloat(other_overhead) || 0,
      notes:         notes || null,
    }, { onConflict: 'year,month' })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}
