import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { UserRole } from '@/types';
import { AUTH_CONSTANTS } from '@/lib/constants';

// Helper para validar que el rol es válido
function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && Object.values(UserRole).includes(role as UserRole);
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  session: {
    strategy: 'jwt',
    maxAge: AUTH_CONSTANTS.SESSION_MAX_AGE, // 24 horas (más seguro que 7 días)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Validar que el rol sea válido antes de añadirlo al token
        if (isValidRole(user.role)) {
          token.role = user.role;
        } else {
          // Si el rol no es válido, usar GENERAL por defecto
          console.error(`Rol inválido detectado: ${user.role}, usando GENERAL por defecto`);
          token.role = UserRole.GENERAL;
        }
        token.id = user.id;
        token.assignedParkingSpot = user.assignedParkingSpot;
      }

      // SEGURIDAD: Validar que el rol en el token siga siendo válido
      // (protección contra manipulación de JWT)
      if (token.role && !isValidRole(token.role)) {
        console.error(`Rol en token manipulado: ${token.role}, invalidando sesión`);
        return {}; // Invalidar token
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Verificar nuevamente antes de asignar a la sesión
        if (isValidRole(token.role)) {
          session.user.role = token.role;
        } else {
          session.user.role = UserRole.GENERAL;
        }
        session.user.id = token.id as string;
        session.user.assignedParkingSpot = token.assignedParkingSpot as string;
      }
      return session;
    },
  },
});
