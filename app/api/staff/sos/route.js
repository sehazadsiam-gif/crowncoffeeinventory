import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { sendWhatsAppNotification } from '../../../../lib/whatsapp'

export const dynamic = 'force-dynamic'

/**
 * POST /api/staff/sos
 * Triggers an emergency SOS panic alert.
 * Body: { staffId, latitude, longitude, batteryLevel?, notes? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { staffId, latitude, longitude, batteryLevel, notes } = body

    if (!staffId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'staffId, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    // 1. Fetch staff info & emergency contact
    const { data: staff, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, phone, emergency_phone, designation')
      .eq('id', staffId)
      .single()

    if (sErr || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // 2. Insert SOS alert
    const { data: alert, error: aErr } = await supabaseAdmin
      .from('sos_alerts')
      .insert({
        staff_id: staffId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        battery_level: batteryLevel ? parseInt(batteryLevel) : null,
        status: 'active',
        notes: notes || 'Emergency SOS triggered from staff portal'
      })
      .select()
      .single()

    if (aErr) throw aErr

    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`

    // 3. Attempt WhatsApp alert dispatch to admin / emergency phone
    const alertText = `🚨 *EMERGENCY SOS ALERT - CROWN COFFEE*\n\nStaff: *${staff.name}* (ID: ${staff.employee_id || 'N/A'})\nDesignation: ${staff.designation || 'Staff'}\nBattery: ${batteryLevel ? `${batteryLevel}%` : 'Unknown'}\nTime: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })}\n\n📍 *Live Location*: ${googleMapsUrl}\n\nPlease check immediately!`

    const adminPhone = process.env.ADMIN_EMERGENCY_PHONE || staff.emergency_phone || null
    if (adminPhone) {
      try {
        await sendWhatsAppNotification({ phone: adminPhone, text: alertText })
      } catch (waErr) {
        console.warn('[SOS] WhatsApp notification failed (non-blocking):', waErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      googleMapsUrl,
      staffName: staff.name
    })
  } catch (err) {
    console.error('[POST /api/staff/sos]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/staff/sos?status=active|all
 * Fetches SOS alerts for admin monitoring.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    let query = supabaseAdmin
      .from('sos_alerts')
      .select(`
        id,
        staff_id,
        latitude,
        longitude,
        battery_level,
        status,
        notes,
        created_at,
        resolved_at,
        resolved_by,
        staff:staff_id (
          id,
          name,
          employee_id,
          phone,
          designation,
          photo_url
        )
      `)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: alerts, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      alerts: alerts || []
    })
  } catch (err) {
    console.error('[GET /api/staff/sos]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/staff/sos
 * Resolves an SOS alert.
 * Body: { alertId, resolvedBy?, notes? }
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { alertId, resolvedBy = 'Admin', notes } = body

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('sos_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        notes: notes ? `Resolved: ${notes}` : undefined
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, alert: data })
  } catch (err) {
    console.error('[PATCH /api/staff/sos]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
