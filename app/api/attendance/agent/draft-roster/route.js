import { NextResponse } from 'next/server'
import { draftWeeklyRoster } from '../../../../../lib/attendance-agent'

export async function POST(request) {
  try {
    const { week_start } = await request.json()

    if (!week_start) {
      return NextResponse.json({ error: 'week_start is required' }, { status: 400 })
    }

    const result = await draftWeeklyRoster(week_start)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/attendance/agent/draft-roster]', err)
    return NextResponse.json({ error: err.message || 'Failed to draft roster' }, { status: 500 })
  }
}
