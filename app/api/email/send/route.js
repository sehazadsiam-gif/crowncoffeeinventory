import { sendRemarkEmail, sendPayrollEmail, sendPaymentEmail, sendAdvanceEmail } from '../../../../lib/email'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Email API called:', body.type, 'to:', body.to)
    const { type, ...data } = body
    if (!data.to) {
      console.log('No email address provided, skipping')
      return Response.json({ success: true, skipped: true })
    }
    if (type === 'remark') await sendRemarkEmail(data)
    if (type === 'payroll') await sendPayrollEmail(data)
    if (type === 'payment') await sendPaymentEmail(data)
    if (type === 'advance') await sendAdvanceEmail(data)
    console.log('Email sent successfully to:', data.to)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Email API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
