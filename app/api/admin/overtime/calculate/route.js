export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const staffId = body.staff_id
    const month = body.month
    const year = body.year

    if (!staffId || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Overtime calculation started'
    }, { status: 200 })

  } catch (error) {
    console.error('Calculate overtime error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
