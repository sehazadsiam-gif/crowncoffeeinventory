export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { validateSession } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'
import { sendBroadcastEmail } from '../../../../lib/email'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subject, message } = await request.json()

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const { data: members } = await supabase
      .from('members')
      .select('id, email, full_name, phone')
      .eq('status', 'active')

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No active members found' }, { status: 404 })
    }

    let successCount = 0
    let failureCount = 0
    const errors = []

    for (const member of members) {
      try {
        await sendBroadcastEmail({
          to: member.email,
          name: member.full_name,
          subject: subject,
          message: message
        }).catch(err => {
          failureCount++
          errors.push(member.email)
        })
        successCount++
      } catch (err) {
        failureCount++
        errors.push(member.email)
      }
    }

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      sent: successCount,
      failed: failureCount
    }, { status: 200 })

  } catch (error) {
    console.error('Broadcast message error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
