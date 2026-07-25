/**
 * POST /api/attendance/checkin
 *
 * Unified check-in endpoint. Called by:
 *   - QR code scanner (browser camera)
 *   - Admin manual entry
 *   - Future biometric/RFID device (set source: 'biometric', include X-Device-Key header)
 *
 * Body: { identifier, timestamp?, source?, notes?, adminOverride?, forceStatus? }
 * identifier = staff UUID or employee_id string (CC-001)
 */

import { NextResponse } from 'next/server'
import { logAttendance } from '../../../../lib/attendance-service'
import { validateSession } from '../../../../lib/auth'
import { supabaseAdmin } from '../../../../lib/supabase'

const DEVICE_API_KEY = process.env.ATTENDANCE_DEVICE_KEY // set when biometric device is known

export async function POST(request) {
  try {
    // ── Auth: either a valid session (admin/staff) or a device API key ──
    const cookieHeader = request.headers.get('cookie') || ''
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)cc_token=([^;]+)/)
    const bearerMatch = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)/)
    const sessionToken = tokenMatch?.[1] || bearerMatch?.[1]

    const deviceKey = request.headers.get('x-device-key')

    let isAuthorised = false
    let isAdmin = false

    if (deviceKey && DEVICE_API_KEY && deviceKey === DEVICE_API_KEY) {
      // Future biometric device — authorised by API key
      isAuthorised = true
    } else if (sessionToken) {
      const session = await validateSession(sessionToken)
      if (session) {
        isAuthorised = true
        isAdmin = session.role === 'admin' || session.role === 'sub_admin'
      }
    }

    // Also allow QR/RFID kiosk self-checkin
    if (!isAuthorised) {
      const bodyClone = await request.clone().json().catch(() => ({}))
      if (bodyClone.token) {
        const session = await validateSession(bodyClone.token)
        if (session) isAuthorised = true
      } else if (bodyClone.source === 'kiosk' || bodyClone.source === 'rfid' || bodyClone.source === 'qr' || bodyClone.source === 'manual') {
        isAuthorised = true
      }
    }

    if (!isAuthorised) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()
    const { identifier, timestamp, source = 'manual', notes, adminOverride, forceStatus, enableBreak } = body

    if (!identifier) {
      return NextResponse.json({ error: 'identifier is required' }, { status: 400 })
    }

    // Admin-only: allow override status
    if (adminOverride && !isAdmin) {
      return NextResponse.json({ error: 'Only admin can override status' }, { status: 403 })
    }

    const result = await logAttendance({
      identifier,
      timestamp,
      source: deviceKey ? 'biometric' : source,
      notes,
      adminOverride: !!adminOverride,
      forceStatus,
      enableBreak: !!enableBreak
    })

    // Blocked = day already complete (both taps done). Return 200, not 400.
    if (result.blocked) {
      return NextResponse.json({ blocked: true, staff: result.staff }, { status: 200 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/attendance/checkin]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/attendance/checkin?action=checkout
 */
export async function PUT(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)cc_token=([^;]+)/)
    const bearerMatch = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)/)
    const sessionToken = tokenMatch?.[1] || bearerMatch?.[1]
    if (!sessionToken) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    const session = await validateSession(sessionToken)
    if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { logCheckOut } = await import('../../../../lib/attendance-service')
    const body = await request.json()
    const { identifier, timestamp, source = 'manual' } = body

    const result = await logCheckOut({ identifier, timestamp, source })
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
