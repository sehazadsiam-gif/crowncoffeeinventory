import { sendRemarkEmail, sendPayrollEmail, sendPaymentEmail, sendAdvanceEmail, sendLeaveRequestAdminAlert, sendLeaveResponseEmail, sendStaffMessageAlert } from '../../../../lib/email'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Email API called:', body.type, 'to:', body.to)
    const { type, ...data } = body

    // Admin-directed emails use hardcoded admin email, so they don't require 'to' from the frontend
    const adminAlertTypes = ['leave_admin_alert', 'staff_message']

    if (!data.to && !adminAlertTypes.includes(type)) {
      console.log('No email address provided, skipping')
      return Response.json({ success: true, skipped: true })
    }
    if (type === 'remark') await sendRemarkEmail(data)
    if (type === 'payroll') await sendPayrollEmail(data)
    if (type === 'payment') await sendPaymentEmail(data)
    if (type === 'advance') await sendAdvanceEmail(data)
    if (type === 'leave_admin_alert') await sendLeaveRequestAdminAlert(data)
    if (type === 'leave_response') await sendLeaveResponseEmail(data)
    if (type === 'staff_message') await sendStaffMessageAlert(data)
    console.log('Email sent successfully to:', data.to)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Email API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
