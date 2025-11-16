import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import PasswordResetToken from '@/models/PasswordResetToken';
import { AUTH_CONSTANTS } from '@/lib/constants';
import { checkRateLimitRedis, getClientIdentifier } from '@/lib/ratelimit-redis';
import { logger, getRequestContext } from '@/lib/logger';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    ),
});

export async function POST(request: Request) {
  try {
    // RATE LIMITING: Máximo 5 intentos cada 15 minutos por IP
    const identifier = getClientIdentifier(request);
    const rateLimit = await checkRateLimitRedis(`reset-password:${identifier}`, 'registro');

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      logger.warn('Rate limit excedido en reset-password', {
        identifier,
        ...getRequestContext(request),
      });

      return NextResponse.json(
        {
          error: 'Demasiados intentos. Intenta de nuevo más tarde.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    await dbConnect();

    // Buscar token
    const resetToken = await PasswordResetToken.findOne({
      token: validatedData.token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      logger.warn('Token de reset inválido o expirado', {
        token: validatedData.token.slice(0, 8) + '...',
        ...getRequestContext(request),
      });

      return NextResponse.json(
        {
          error: 'El enlace de restablecimiento es inválido o ha expirado. Solicita uno nuevo.',
        },
        { status: 400 },
      );
    }

    // Buscar usuario
    const user = await User.findById(resetToken.userId);

    if (!user) {
      logger.error('Usuario no encontrado para token de reset', undefined, {
        userId: resetToken.userId.toString(),
      });

      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(
      validatedData.password,
      AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS,
    );

    // Actualizar contraseña
    user.password = hashedPassword;
    await user.save();

    // Marcar token como usado
    resetToken.used = true;
    await resetToken.save();

    logger.info('Contraseña restablecida exitosamente', {
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json({
      message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    logger.error('Error en reset-password', error as Error, getRequestContext(request));
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
