import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import nodemailer from 'nodemailer'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
})

export const dynamic = 'force-dynamic'

/**
 * GET /api/attendance/daily-summary
 * Called by cron at end of day. Sends a summary email to admin.
 */
export async function GET(request) {
  try {
    // Use BST for today
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    const todayDisplay = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Dhaka', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    // Fetch all active staff
    const { data: staff } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    // Fetch today's logs
    const { data: logs } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .eq('date', today)

    const logMap = new Map((logs || []).map(l => [l.staff_id, l]))

    const present = [], late = [], absent = [], checkedOut = []

    for (const s of (staff || [])) {
      const log = logMap.get(s.id)
      if (!log) {
        absent.push(s)
      } else if (log.status === 'late') {
        late.push({ ...s, log })
        if (log.check_out_at) checkedOut.push({ ...s, log })
      } else if (log.status === 'present') {
        present.push({ ...s, log })
        if (log.check_out_at) checkedOut.push({ ...s, log })
      }
    }

    const fmtTime = (isoStr) => isoStr
      ? new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
      : '—'

    const rowStyle = 'padding: 8px 12px; border-bottom: 1px solid #F0F0F0;'
    const buildRows = (list, showLate = false) =>
      list.map(s => `
        <tr>
          <td style="${rowStyle}">${s.name}</td>
          <td style="${rowStyle}">${s.employee_id || '—'}</td>
          <td style="${rowStyle}">${s.designation || '—'}</td>
          ${showLate ? `<td style="${rowStyle}">${fmtTime(s.log?.check_in_at)} ${s.log?.minutes_late ? `(+${s.log.minutes_late}m late)` : ''}</td>` : ''}
          ${showLate ? `<td style="${rowStyle}">${fmtTime(s.log?.check_out_at)}</td>` : ''}
        </tr>
      `).join('')

    const absentRows = absent.map(s => `
      <tr>
        <td style="${rowStyle} color:#DC2626; font-weight:700;">${s.name}</td>
        <td style="${rowStyle}">${s.employee_id || '—'}</td>
        <td style="${rowStyle}">${s.designation || '—'}</td>
      </tr>
    `).join('')

    const html = `
      <div style="font-family: 'Segoe UI', sans-serif; padding: 32px; background: #FAFAFA;">
        <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #E0E0E0; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          
          <div style="background: linear-gradient(135deg, #3B1F0E, #6B3A2A); padding: 24px 28px; border-radius: 12px; margin-bottom: 28px;">
            <h1 style="margin: 0 0 6px; color: #F5C97A; font-size: 22px;">☕ Crown Coffee</h1>
            <p style="margin: 0; color: #D4A87A; font-size: 14px;">Daily Attendance Summary — ${todayDisplay}</p>
          </div>

          <!-- Stats Row -->
          <div style="display: flex; gap: 16px; margin-bottom: 28px;">
            <div style="flex:1; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:16px; text-align:center;">
              <div style="font-size:32px; font-weight:900; color:#059669;">${present.length + late.length}</div>
              <div style="font-size:11px; color:#065F46; font-weight:700; text-transform:uppercase;">Checked In</div>
            </div>
            <div style="flex:1; background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:16px; text-align:center;">
              <div style="font-size:32px; font-weight:900; color:#D97706;">${late.length}</div>
              <div style="font-size:11px; color:#92400E; font-weight:700; text-transform:uppercase;">Late</div>
            </div>
            <div style="flex:1; background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:16px; text-align:center;">
              <div style="font-size:32px; font-weight:900; color:#DC2626;">${absent.length}</div>
              <div style="font-size:11px; color:#991B1B; font-weight:700; text-transform:uppercase;">Absent</div>
            </div>
            <div style="flex:1; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:16px; text-align:center;">
              <div style="font-size:32px; font-weight:900; color:#1D4ED8;">${checkedOut.length}</div>
              <div style="font-size:11px; color:#1E3A8A; font-weight:700; text-transform:uppercase;">Checked Out</div>
            </div>
          </div>

          ${present.length + late.length > 0 ? `
          <h3 style="margin: 0 0 10px; color: #065F46; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
            ✅ Present (${present.length + late.length} Staff)
          </h3>
          <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:24px;">
            <thead><tr style="background:#F1F5F9;">
              <th style="${rowStyle} text-align:left;">Name</th>
              <th style="${rowStyle} text-align:left;">ID</th>
              <th style="${rowStyle} text-align:left;">Role</th>
              <th style="${rowStyle} text-align:left;">Check-In</th>
              <th style="${rowStyle} text-align:left;">Check-Out</th>
            </tr></thead>
            <tbody>${buildRows([...present, ...late], true)}</tbody>
          </table>` : ''}

          ${absent.length > 0 ? `
          <h3 style="margin: 0 0 10px; color: #DC2626; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
            ❌ Absent Today (${absent.length} Staff)
          </h3>
          <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:24px;">
            <thead><tr style="background:#F1F5F9;">
              <th style="${rowStyle} text-align:left;">Name</th>
              <th style="${rowStyle} text-align:left;">ID</th>
              <th style="${rowStyle} text-align:left;">Role</th>
            </tr></thead>
            <tbody>${absentRows}</tbody>
          </table>` : '<p style="color:#059669; font-weight:700;">🎉 No absent staff today!</p>'}

          <div style="margin-top:24px; text-align:center; color:#9C8A76; font-size:11px; border-top: 1px solid #F0EBE3; padding-top:16px;">
            Crown Coffee — Automated Attendance Summary
          </div>
        </div>
      </div>
    `

    if (!ADMIN_EMAIL) {
      return NextResponse.json({ success: false, error: 'No admin email configured' })
    }

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `📋 Crown Coffee Daily Summary — ${todayDisplay} | ${present.length + late.length} In, ${absent.length} Absent`,
      html
    })

    return NextResponse.json({
      success: true,
      date: today,
      present: present.length + late.length,
      late: late.length,
      absent: absent.length,
      checkedOut: checkedOut.length
    })
  } catch (err) {
    console.error('[GET /api/attendance/daily-summary]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
