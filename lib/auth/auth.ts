import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { UserRole } from '@/types';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 días (más seguro para app corporativa)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.assignedParkingSpot = user.assignedParkingSpot;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.id = token.id as string;
        session.user.assignedParkingSpot = token.assignedParkingSpot as string;
      }
      return session;
    },
  },
});
