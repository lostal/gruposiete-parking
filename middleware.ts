import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NO importar auth aquí para evitar Edge Runtime issues
// La autenticación se verifica en las páginas/API routes

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login', '/registro', '/forgot-password', '/reset-password', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
  );

  const hasSession = !!sessionToken;

  if (!hasSession && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && (pathname === '/login' || pathname === '/registro')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|site.webmanifest|manifest.json|sw.js|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)',
  ],
};
