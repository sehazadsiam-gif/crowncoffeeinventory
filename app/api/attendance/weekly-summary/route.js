import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import nodemailer from 'nodemailer'
import { injectAugustBaselineLogs } from '../../../../lib/attendance-service'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS
  }
})

export async function GET(request) {
  return sendWeeklySummary()
}

export async function POST(request) {
  return sendWeeklySummary()
}

async function sendWeeklySummary() {
  try {
    if (!ADMIN_EMAIL) {
      return NextResponse.json({ error: 'ADMIN_EMAIL or GMAIL_USER not configured' }, { status: 400 })
    }

    const today = new Date()
    // Calculate last 7 days range in Bangladesh Standard Time (Asia/Dhaka)
    const endDateStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    const startDateObj = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    const startDateStr = startDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation')
      .eq('is_active', true)
      .order('name', { ascending: true })

    const { data: rawLogs } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)

    const logs = injectAugustBaselineLogs(rawLogs || [], staffList || [], startDateStr, endDateStr)

    const staffStats = (staffList || []).map(s => {
      const myLogs = (logs || []).filter(l => l.staff_id === s.id)
      const present = myLogs.filter(l => l.status === 'present').length
      const late = myLogs.filter(l => l.status === 'late').length
      const absent = myLogs.filter(l => l.status === 'absent').length
      const totalHours = myLogs.reduce((acc, l) => acc + Number(l.hours_worked || 0), 0)

      return {
        name: s.name,
        employee_id: s.employee_id,
        designation: s.designation || 'Staff',
        present,
        late,
        absent,
        totalHours: Math.round(totalHours * 10) / 10
      }
    })

    const rowsHtml = staffStats.map(s => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${s.name} (${s.employee_id})</td>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #16A34A; font-weight: 700;">${s.present}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #D97706; font-weight: 700;">${s.late}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; color: #DC2626; font-weight: 700;">${s.absent}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; font-weight: 700;">${s.totalHours} hrs</td>
      </tr>
    `).join('')

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; background: #FAF7F2;">
        <div style="background: #0F172A; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; color: #D4933A;">CROWN COFFEE</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #94A3B8;">Weekly Attendance Report (${startDateStr} to ${endDateStr})</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #E2E8F0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
              <tr style="background: #F1F5F9; color: #475569;">
                <th style="padding: 10px;">Staff</th>
                <th style="padding: 10px;">Present</th>
                <th style="padding: 10px;">Late</th>
                <th style="padding: 10px;">Absent</th>
                <th style="padding: 10px;">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `Weekly Attendance Summary — Crown Coffee (${startDateStr} to ${endDateStr})`,
      html: emailHtml
    })

    return NextResponse.json({ success: true, message: 'Weekly summary email sent successfully.' })
  } catch (err) {
    console.error('[weekly-summary API]', err)
    return NextResponse.json({ error: err.message || 'Failed to send weekly summary' }, { status: 500 })
  }
}
