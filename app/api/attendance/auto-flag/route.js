import { NextResponse } from 'next/server'
import { autoFlagAbsent } from '../../../../lib/attendance-service'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { date } = body

    const result = await autoFlagAbsent(date)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Support GET for easy Cron / Vercel Cron triggers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    const result = await autoFlagAbsent(date)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
