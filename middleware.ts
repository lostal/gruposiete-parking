import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NO importar auth aquí para evitar Edge Runtime issues
// La autenticación se verifica en las páginas/API routes

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/registro', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Rutas de API siempre permitidas (NextAuth maneja su propia autenticación)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión de NextAuth
  const sessionToken = request.cookies.get(
    process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
  );

  const hasSession = !!sessionToken;

  // Si no hay sesión y la ruta no es pública, redirigir a login
  if (!hasSession && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si hay sesión y está en login/registro, redirigir al dashboard
  if (hasSession && (pathname === '/login' || pathname === '/registro')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)'],
};
