import { NextResponse } from 'next/server'
import { createCostingUser, requireRole } from '../../../../../lib/costing-auth'

// POST /api/costing/auth/setup — create first admin user
// Protected: requires either no admin users yet, or an existing admin session
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, name, role = 'chef', setupKey } = body

    // Allow setup with a special key (from env) for bootstrapping first admin
    const isSetupKey = setupKey && setupKey === process.env.COSTING_SETUP_KEY
    if (!isSetupKey) {
      const { error, status } = await requireRole(request, 'admin')
      if (error) return NextResponse.json({ error }, { status })
    }

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'email, password, and name are required' }, { status: 400 })
    }
    if (!['chef', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'role must be chef or admin' }, { status: 400 })
    }

    const user = await createCostingUser(email, password, name, role)
    return NextResponse.json({ ok: true, user })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
