import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth pages that logged-in users shouldn't see
const AUTH_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('cm_access_token')?.value;

  // Redirect authenticated users away from login/register
  if (token && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
