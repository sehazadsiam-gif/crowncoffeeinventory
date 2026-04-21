import { validateSession } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { token } = await request.json()
    const session = await validateSession(token)
    if (!session) {
      return Response.json({ valid: false }, { status: 401 })
    }
    return Response.json({ valid: true, role: session.role, user_id: session.user_id })
  } catch (error) {
    return Response.json({ valid: false }, { status: 401 })
  }
}
