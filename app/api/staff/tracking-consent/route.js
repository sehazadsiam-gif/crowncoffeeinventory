import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/tracking-consent?staffId=...
 * POST /api/staff/tracking-consent
 * Body: { staffId, consented: true, deviceInfo: '...' }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('tracking_consent')
      .select('*')
      .eq('staff_id', staffId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      consented: data?.consented || false,
      consentedAt: data?.consented_at || null
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { staffId, consented = true, deviceInfo = '' } = body

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const { data, error } = await supabaseAdmin
      .from('tracking_consent')
      .upsert({
        staff_id: staffId,
        consented: !!consented,
        consented_at: consented ? new Date().toISOString() : null,
        revoked_at: !consented ? new Date().toISOString() : null,
        ip_address: ip,
        device_info: deviceInfo
      }, { onConflict: 'staff_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, consent: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
