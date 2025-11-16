import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import { AUTH_CONSTANTS, isValidCorporateEmail } from '@/lib/constants';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    ),
});

export default {
  providers: [
    Credentials({
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        await dbConnect();
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: (user._id as any).toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          assignedParkingSpot: user.assignedParkingSpot?.toString(),
        };
      },
    }),
  ],
} satisfies NextAuthConfig;
