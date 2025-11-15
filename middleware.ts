import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔍 DEBUG: Verificar NEXTAUTH_SECRET
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('❌ [middleware] NEXTAUTH_SECRET no está definido');
  } else {
    console.log('✅ [middleware] NEXTAUTH_SECRET existe');
  }

  const token = await getToken({ req: request, secret });

  // 🔍 DEBUG: Verificar token
  if (token) {
    console.log(`✅ [middleware] Token válido para ${pathname}`);
    console.log(`   User: ${token.email}, Role: ${token.role}`);
  } else {
    console.log(`❌ [middleware] No hay token para ${pathname}`);
  }

  // Rutas públicas
  const publicRoutes = ['/login', '/registro', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Rutas de API siempre permitidas
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Si no hay sesión y la ruta no es pública, redirigir a login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Si hay sesión y está en login/registro, redirigir al dashboard
  if (token && (pathname === '/login' || pathname === '/registro')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)'],
};
