import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import { UserRole } from '@/types';

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.nativeEnum(UserRole).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    await dbConnect();

    // SEGURIDAD: Solo ADMIN puede crear usuarios con roles especiales
    let finalRole = UserRole.GENERAL;

    if (validatedData.role && validatedData.role !== UserRole.GENERAL) {
      // Verificar que el solicitante sea ADMIN
      const { auth } = await import('@/lib/auth/auth');
      const session = await auth();

      if (!session || session.user.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'Solo los administradores pueden crear usuarios con roles especiales' },
          { status: 403 },
        );
      }

      finalRole = validatedData.role;
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 400 });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Crear usuario
    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: finalRole,
    });

    // No devolver la contraseña
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

    console.error('Error en registro:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
