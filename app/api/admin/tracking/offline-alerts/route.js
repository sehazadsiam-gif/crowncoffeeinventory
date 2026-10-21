import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tracking/offline-alerts
 * Scans active staff locations for low battery (<15%) or offline (>15m) warnings.
 */
export async function GET() {
  try {
    const { data: staffList, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, phone, designation, photo_url')
      .eq('is_active', true)

    if (sErr) throw sErr

    const { data: locations, error: lErr } = await supabaseAdmin
      .from('staff_locations')
      .select('*')

    if (lErr) throw lErr

    const locMap = new Map()
    ;(locations || []).forEach((l) => locMap.set(l.staff_id, l))

    const now = Date.now()
    const lowBatteryAlerts = []
    const offlineAlerts = []

    staffList.forEach((staff) => {
      const loc = locMap.get(staff.id)
      if (!loc || !loc.last_updated) {
        offlineAlerts.push({
          staff_id: staff.id,
          name: staff.name,
          employee_id: staff.employee_id,
          phone: staff.phone,
          designation: staff.designation,
          reason: 'No location ever recorded'
        })
        return
      }

      const lastTime = new Date(loc.last_updated).getTime()
      const diffMins = Math.round((now - lastTime) / 60000)

      if (diffMins > 15) {
        offlineAlerts.push({
          staff_id: staff.id,
          name: staff.name,
          employee_id: staff.employee_id,
          phone: staff.phone,
          designation: staff.designation,
          last_seen: loc.last_updated,
          minutes_offline: diffMins,
          reason: `Signal lost ${diffMins} minutes ago`
        })
      }

      if (loc.battery_level !== null && loc.battery_level < 15 && !loc.is_charging) {
        lowBatteryAlerts.push({
          staff_id: staff.id,
          name: staff.name,
          employee_id: staff.employee_id,
          phone: staff.phone,
          battery_level: loc.battery_level,
          last_updated: loc.last_updated,
          reason: `Critical battery (${loc.battery_level}%)`
        })
      }
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_active_staff: staffList.length,
        offline_count: offlineAlerts.length,
        low_battery_count: lowBatteryAlerts.length
      },
      offlineAlerts,
      lowBatteryAlerts
    })
  } catch (err) {
    console.error('[GET /api/admin/tracking/offline-alerts]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
