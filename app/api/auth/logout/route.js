import { deleteSession } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (token) await deleteSession(token)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: true })
  }
}
