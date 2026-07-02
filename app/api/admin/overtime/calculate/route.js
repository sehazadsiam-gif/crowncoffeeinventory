import { NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'
import { calculateStaffOvertime } from '../../../../../lib/overtime'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { staff_id, month, year } = await request.json()

    if (!staff_id || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await calculateStaffOvertime(staff_id, month, year)

    return NextResponse.json({
      success: true,
      ...result
    }, { status: 200 })

  } catch (error) {
    console.error('Calculate overtime error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
