export async function GET() {
  return Response.json({ message: 'Use /api/auth/staff-login' })
}

export async function POST(request) {
  return Response.json({ error: 'Use /api/auth/staff-login' }, { status: 400 })
}
