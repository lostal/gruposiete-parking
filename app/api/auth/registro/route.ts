import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import { UserRole } from '@/types';
import { checkRateLimitRedis, getClientIdentifier } from '@/lib/ratelimit-redis';
import { AUTH_CONSTANTS, VALIDATION_CONSTANTS, isValidCorporateEmail } from '@/lib/constants';
import { sanitizeName, sanitizeEmail, containsMaliciousContent } from '@/lib/sanitize';
import { logger } from '@/lib/logger';

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(VALIDATION_CONSTANTS.MAX_NAME_LENGTH, 'El nombre es demasiado largo'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    ),
  role: z.nativeEnum(UserRole).optional(),
});

export async function POST(request: Request) {
  try {
    // RATE LIMITING: Máximo 5 registros por IP cada 15 minutos
    const identifier = getClientIdentifier(request);
    const rateLimit = await checkRateLimitRedis(`register:${identifier}`, 'registro');

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Demasiados intentos de registro. Intenta de nuevo más tarde.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    const body = await request.json();

    // Sanitizar inputs antes de validar
    const sanitizedBody = {
      ...body,
      name: sanitizeName(body.name || ''),
      email: sanitizeEmail(body.email || ''),
    };

    // Verificar contenido malicioso
    if (containsMaliciousContent(sanitizedBody.name)) {
      return NextResponse.json(
        { error: 'El nombre contiene caracteres no permitidos' },
        { status: 400 },
      );
    }

    const validatedData = registerSchema.parse(sanitizedBody);

    // Verificar que sea un email corporativo (@gruposiete.es)
    if (!isValidCorporateEmail(validatedData.email)) {
      return NextResponse.json(
        { error: 'Solo se permiten emails corporativos (@gruposiete.es)' },
        { status: 400 },
      );
    }

    await dbConnect();

    const finalRole = validatedData.role || UserRole.GENERAL;

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      // SEGURIDAD: Evitar revelar si el email existe (prevenir enumeración de usuarios)
      // Solo para usuarios no autenticados. Los admins pueden ver el error específico.
      const { auth } = await import('@/lib/auth/auth');
      const session = await auth();
      const isAdmin = session && session.user.role === UserRole.ADMIN;

      if (!isAdmin) {
        // Delay artificial para prevenir timing attacks
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return NextResponse.json(
          {
            error:
              'No se pudo completar el registro. Si el email es válido, verifica que no esté ya registrado.',
          },
          { status: 400 },
        );
      }

      // Para admins, mostrar mensaje específico
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(
      validatedData.password,
      AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS,
    );

    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: finalRole,
    });

    const { password, ...userWithoutPassword } = user.toObject();

    return NextResponse.json(
      {
        message: 'Usuario creado correctamente',
        user: userWithoutPassword,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    logger.error('Error en registro', error as Error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
