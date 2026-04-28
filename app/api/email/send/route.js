import { sendRemarkEmail, sendPayrollEmail, sendPaymentEmail, sendAdvanceEmail } from '../../../../lib/email'

export async function POST(request) {
  try {
    const { type, ...data } = await request.json()
    if (type === 'remark') await sendRemarkEmail(data)
    if (type === 'payroll') await sendPayrollEmail(data)
    if (type === 'payment') await sendPaymentEmail(data)
    if (type === 'advance') await sendAdvanceEmail(data)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
