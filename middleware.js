import { NextResponse } from 'next/server'

const COSTING_COOKIE = 'cc_costing_token'
const AUTH_COOKIE = 'cc_token'

export function middleware(request) {
  const url = request.nextUrl.clone()
  const path = url.pathname

  // ── 1. Admin Routes Server-Side Protection ──────────────────
  if (path.startsWith('/admin')) {
    // Whitelist /admin/login and view-only menu engineering
    const isLoginRoute = path === '/admin/login' || path.startsWith('/admin/login/')
    const isViewRoute = path === '/admin/menu-engineering/view'

    if (!isLoginRoute && !isViewRoute) {
      const hasAuthCookie = request.cookies.has(AUTH_COOKIE)
      const hasCostingCookie = request.cookies.has(COSTING_COOKIE)
      const role = request.cookies.get('cc_role')?.value

      // Must have valid token and not be a regular staff member
      if ((!hasAuthCookie && !hasCostingCookie) || role === 'staff') {
        const loginUrl = new URL('/admin/login', request.url)
        loginUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  // ── 2. Costing module route protection ──────────────────────
  if (path.startsWith('/menu-costings') && !path.startsWith('/menu-costings/login') && !path.startsWith('/menu-costings/view')) {
    const hasCostingCookie = request.cookies.has(COSTING_COOKIE)
    const hasAuthCookie = request.cookies.has(AUTH_COOKIE)
    if (!hasCostingCookie && !hasAuthCookie) {
      return NextResponse.redirect(new URL('/menu-costings/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/menu-costings/:path*',
  ],
}
