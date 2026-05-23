import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const proxy = auth((req) => {
  const isE2EAuth =
    process.env.E2E_AUTH_BYPASS === '1' &&
    req.cookies.get('vibecraft-e2e-auth')?.value === '1';
  const isAuth = !!req.auth?.user || isE2EAuth;
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
