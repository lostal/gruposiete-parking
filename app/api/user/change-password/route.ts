import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import { UserRole } from '@/types';
import { AUTH_CONSTANTS } from '@/lib/constants';
import { logger, getRequestContext } from '@/lib/logger';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `La nueva contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    ),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Los admin no pueden cambiar su contraseña desde aquí
    if (session.user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Los administradores no pueden cambiar su contraseña' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 401 });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(validatedData.newPassword, user.password);

    if (isSamePassword) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe ser diferente a la actual' },
        { status: 400 },
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(
      validatedData.newPassword,
      AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS,
    );

    // Actualizar contraseña
    user.password = hashedPassword;
    await user.save();

    logger.info('Contraseña actualizada', {
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json({
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    logger.error('Error al cambiar contraseña', error as Error, getRequestContext(request));
    return NextResponse.json({ error: 'Error al cambiar la contraseña' }, { status: 500 });
  }
}
