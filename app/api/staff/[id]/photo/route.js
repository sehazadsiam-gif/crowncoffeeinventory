import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return new NextResponse('Staff ID required', { status: 400 })
    }

    const { data: staff, error } = await supabaseAdmin
      .from('staff')
      .select('photo_url')
      .eq('id', id)
      .single()

    if (error || !staff || !staff.photo_url) {
      return new NextResponse('Photo not found', { status: 404 })
    }

    const photoStr = staff.photo_url

    // Handle external URL (e.g., https://...)
    if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
      return NextResponse.redirect(photoStr)
    }

    // Handle Data URI (e.g., data:image/jpeg;base64,...)
    if (photoStr.startsWith('data:')) {
      const matches = photoStr.match(/^data:([^;]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const mimeType = matches[1]
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          },
        })
      }
    }

    return new NextResponse('Invalid photo format', { status: 400 })
  } catch (err) {
    console.error('[GET /api/staff/[id]/photo]', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
