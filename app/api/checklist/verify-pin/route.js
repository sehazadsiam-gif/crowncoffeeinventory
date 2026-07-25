import { NextResponse } from 'next/server'

/**
 * POST /api/checklist/verify-pin
 * Body: { pin: "456456" }
 */
export async function POST(request) {
  try {
    const { pin } = await request.json()
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

    if (String(pin).trim() === '456456') {
      return NextResponse.json({ success: true, message: 'Manager PIN verified' })
    }

    return NextResponse.json({ error: 'Invalid Manager PIN' }, { status: 401 })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
