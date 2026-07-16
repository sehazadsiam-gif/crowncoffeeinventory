import { NextResponse } from 'next/server'

const COOKIE_NAME = 'cc_costing_token'

export function middleware(request) {
  const url = request.nextUrl.clone()
  const path = url.pathname

  // ── Hostname redirect (existing) ──────────────────────────
  if (url.hostname === 'ccadmin.online') {
    url.hostname = 'www.ccadmin.online'
    return NextResponse.redirect(url)
  }

  // ── Costing module route protection ──────────────────────
  const hasCostingCookie = request.cookies.has(COOKIE_NAME)

  // /menu-costings/** routes (except /menu-costings/login)
  if (path.startsWith('/menu-costings') && !path.startsWith('/menu-costings/login')) {
    if (!hasCostingCookie) {
      return NextResponse.redirect(new URL('/menu-costings/login', request.url))
    }
  }

  // /admin/menu-engineering routes — require the costing cookie
  // Full role validation happens in the server component
  if (path.startsWith('/admin/menu-engineering')) {
    if (!hasCostingCookie) {
      return NextResponse.redirect(new URL('/menu-costings/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/menu-costings/:path*',
    '/admin/menu-engineering/:path*',
  ],
}
