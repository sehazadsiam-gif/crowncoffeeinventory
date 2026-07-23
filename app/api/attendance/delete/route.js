import { NextResponse } from 'next/server'
import { deleteDayAttendance } from '../../../../lib/attendance-service'
import { validateSession } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

async function handleDelete(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)cc_token=([^;]+)/)
    const bearerMatch = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)/)
    const sessionToken = tokenMatch?.[1] || bearerMatch?.[1]

    if (sessionToken) {
      const session = await validateSession(sessionToken)
      if (session && session.role !== 'admin' && session.role !== 'sub_admin') {
        return NextResponse.json({ error: 'Only admins can delete attendance records' }, { status: 403 })
      }
    }

    let dateStr
    let staffId

    if (request.method === 'DELETE') {
      const { searchParams } = new URL(request.url)
      dateStr = searchParams.get('date')
      staffId = searchParams.get('staff_id') || searchParams.get('staffId')
    } else {
      const body = await request.json().catch(() => ({}))
      dateStr = body.date
      staffId = body.staffId || body.staff_id
    }

    const result = await deleteDayAttendance({ dateStr, staffId })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[DELETE /api/attendance/delete]', err)
    return NextResponse.json({ error: err.message || 'Failed to delete attendance record' }, { status: 500 })
  }
}

export async function POST(request) {
  return handleDelete(request)
}

export async function DELETE(request) {
  return handleDelete(request)
}
