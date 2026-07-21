import { NextResponse } from 'next/server'
import { answerQuery } from '../../../../../lib/attendance-agent'

export async function POST(request) {
  try {
    const { question } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const result = await answerQuery(question)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/attendance/agent/query]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
