import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS
  }
})

export async function GET(request) {
  return sendMonthlyReportCards()
}

export async function POST(request) {
  return sendMonthlyReportCards()
}

async function sendMonthlyReportCards() {
  try {
    const today = new Date()
    // Calculate last month
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const year = prevMonthDate.getFullYear()
    const month = prevMonthDate.getMonth() + 1

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const monthName = prevMonthDate.toLocaleString('en-US', { month: 'long' })

    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, email, designation')
      .eq('is_active', true)
      .not('email', 'is', null)

    const { data: logs } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    let sentCount = 0

    for (const staff of staffList || []) {
      if (!staff.email) continue

      const myLogs = (logs || []).filter(l => l.staff_id === staff.id)
      const present = myLogs.filter(l => l.status === 'present').length
      const late = myLogs.filter(l => l.status === 'late').length
      const absent = myLogs.filter(l => l.status === 'absent').length
      const totalHours = Math.round(myLogs.reduce((acc, l) => acc + Number(l.hours_worked || 0), 0) * 10) / 10

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; background: #FAF7F2; border-radius: 12px;">
          <div style="background: #0F172A; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h2 style="margin: 0; color: #D4933A;">CROWN COFFEE</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #94A3B8;">Monthly Attendance Report Card — ${monthName} ${year}</p>
          </div>
          <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #E2E8F0;">
            <p style="font-size: 16px; font-weight: 700; color: #0F172A; margin-top: 0;">Hello ${staff.name},</p>
            <p style="font-size: 14px; color: #475569;">Here is your official attendance summary for <strong>${monthName} ${year}</strong>:</p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
              <div style="background: #F1F5F9; padding: 14px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 900; color: #16A34A;">${present}</div>
                <div style="font-size: 12px; font-weight: 700; color: #475569;">Days Present</div>
              </div>
              <div style="background: #FEF3C7; padding: 14px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 900; color: #D97706;">${late}</div>
                <div style="font-size: 12px; font-weight: 700; color: #78350F;">Days Late</div>
              </div>
              <div style="background: #FEE2E2; padding: 14px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 900; color: #DC2626;">${absent}</div>
                <div style="font-size: 12px; font-weight: 700; color: #7F1D1D;">Days Absent</div>
              </div>
              <div style="background: #E0F2FE; padding: 14px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 900; color: #0284C7;">${totalHours} h</div>
                <div style="font-size: 12px; font-weight: 700; color: #0C4A6E;">Total Hours Worked</div>
              </div>
            </div>

            <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">If you have any questions regarding your log, please contact management.</p>
          </div>
        </div>
      `

      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: staff.email,
          subject: `Crown Coffee — Your Attendance Report Card for ${monthName} ${year}`,
          html
        })
        sentCount++
      } catch (e) {
        console.error(`Failed to send report card email to ${staff.email}:`, e.message)
      }
    }

    return NextResponse.json({ success: true, message: `Sent ${sentCount} monthly report card email(s).` })
  } catch (err) {
    console.error('[monthly-report-card API]', err)
    return NextResponse.json({ error: err.message || 'Failed to send monthly report cards' }, { status: 500 })
  }
}
