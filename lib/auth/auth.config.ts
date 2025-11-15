import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
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

        // 🔧 Lazy loading para evitar Edge Runtime issues
        const bcrypt = (await import('bcryptjs')).default;
        const dbConnect = (await import('@/lib/db/mongodb')).default;
        const User = (await import('@/models/User')).default;

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
