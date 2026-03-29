import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import authConfig from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Protected routes: everything under /dashboard, /admin, and top-level app pages
  const isProtectedRoute =
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/ideas') ||
    pathname.startsWith('/scripts') ||
    pathname.startsWith('/voice-storm') ||
    pathname.startsWith('/side-quests') ||
    pathname.startsWith('/brand-brain') ||
    pathname.startsWith('/brain-dump');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  // Redirect authenticated users away from auth pages (unless forced by signout param)
  if (isAuthRoute && isLoggedIn) {
    const hasSignout = req.nextUrl.searchParams.has('signout');
    if (!hasSignout) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect non-admin users away from admin routes
  if (isAdminRoute && isLoggedIn && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Pass the pathname in a header so the layout can use it
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/onboarding',
    '/onboarding/:path*',
    '/ideas/:path*',
    '/scripts/:path*',
    '/voice-storm/:path*',
    '/side-quests/:path*',
    '/brand-brain/:path*',
    '/brain-dump/:path*',
    '/',
  ],
};
