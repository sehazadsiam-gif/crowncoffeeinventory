import { NextResponse } from 'next/server'

/**
 * POST /api/checklist/verify-pin
 * Body: { pin: "456456" | "1590", type?: "access" | "action" }
 */
export async function POST(request) {
  try {
    const { pin, type } = await request.json()
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

    const cleanPin = String(pin).trim()

    if (type === 'action' || cleanPin === '1590') {
      if (cleanPin === '1590') {
        return NextResponse.json({ success: true, message: 'Action PIN verified' })
      }
      return NextResponse.json({ error: 'Invalid Edit/Delete PIN (Requires 1590)' }, { status: 401 })
    }

    if (cleanPin === '456456') {
      return NextResponse.json({ success: true, message: 'Manager PIN verified' })
    }

    return NextResponse.json({ error: 'Invalid Manager PIN' }, { status: 401 })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
