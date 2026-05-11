export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { validateSession } from '../../../../../lib/auth'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      logs: []
    }, { status: 200 })

  } catch (error) {
    console.error('Get logs error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
