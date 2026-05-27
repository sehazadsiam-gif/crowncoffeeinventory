import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = request.nextUrl.clone()
  
  if (url.hostname === 'ccadmin.online') {
    url.hostname = 'www.ccadmin.online'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
