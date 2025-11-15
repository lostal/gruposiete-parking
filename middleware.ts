import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Rutas públicas
  const publicRoutes = ['/login', '/registro', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Rutas de API siempre permitidas
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 🔍 DEBUG
  console.error(`[middleware] ${pathname} - Logged in: ${isLoggedIn}`);

  // Si no hay sesión y la ruta no es pública, redirigir a login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Si hay sesión y está en login/registro, redirigir al dashboard
  if (isLoggedIn && (pathname === '/login' || pathname === '/registro')) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)'],
};
