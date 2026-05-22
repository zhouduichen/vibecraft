import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const proxy = auth((req) => {
  const isAuth = !!req.auth?.user;
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth') || req.nextUrl.pathname === '/login';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  if (isApiRoute) return NextResponse.next();

  if (!isAuth && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.svg|templates/|app/).*)'],
};
