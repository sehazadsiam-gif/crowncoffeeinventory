export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import { sendBroadcastEmail } from '../../../../../lib/email'
import { sendSMS } from '../../../../../lib/sms'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || ((session.role !== 'admin' && session.role !== 'sub_admin') && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subject, message, sendEmail, sendSms } = await request.json()

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')

    if (error) throw error

    let successCount = 0

    // Send asynchronously in batches to avoid timing out if there are many members
    // For simplicity, we just await all promises
    const promises = members.map(async (member) => {
      try {
        const tasks = []
        if (sendEmail && member.email) {
          tasks.push(sendBroadcastEmail({
            to: member.email,
            name: member.full_name,
            subject: subject,
            message: message
          }))
        }
        
        if (sendSms && member.phone) {
          const smsMsg = `Crown Coffee: ${subject} - ${message}`
          tasks.push(sendSMS(member.phone, smsMsg))
        }
        
        await Promise.all(tasks)
        successCount++
      } catch (err) {
        console.error(`Error sending to ${member.email}:`, err)
      }
    })

    await Promise.all(promises)

    // Log notification
    await supabase.from('member_notifications').insert([{
      member_id: null,
      type: 'broadcast',
      subject: subject,
      message: message,
      status: 'sent'
    }]).then(({ error }) => {
      if (error) console.error('Log error:', error)
    })

    return NextResponse.json({ success: true, count: successCount })
  } catch (error) {
    console.error('Broadcast error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
