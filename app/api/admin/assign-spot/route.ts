export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import User from '@/models/User';
import ParkingSpot from '@/models/ParkingSpot';
import { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { userId, spotId } = await request.json();

    if (!userId || !spotId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    await dbConnect();

    // Verificar que el usuario exista y sea de Dirección
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (user.role !== UserRole.DIRECCION) {
      return NextResponse.json(
        { error: 'Solo se pueden asignar plazas a usuarios de Dirección' },
        { status: 400 },
      );
    }

    // Verificar que la plaza existe
    const spot = await ParkingSpot.findById(spotId);
    if (!spot) {
      return NextResponse.json({ error: 'Plaza no encontrada' }, { status: 404 });
    }

    // Si el usuario ya tenía una plaza asignada, liberarla
    if (user.assignedParkingSpot) {
      await ParkingSpot.findByIdAndUpdate(user.assignedParkingSpot, {
        assignedTo: null,
      });
    }

    // Si la plaza estaba asignada a otro usuario, desasignarla
    if (spot.assignedTo) {
      await User.findByIdAndUpdate(spot.assignedTo, {
        assignedParkingSpot: null,
      });
    }

    // Asignar la plaza al usuario
    user.assignedParkingSpot = spot._id as any;
    await user.save();

    spot.assignedTo = user._id as any;
    await spot.save();

    return NextResponse.json({
      success: true,
      message: 'Plaza asignada correctamente',
    });
  } catch (error) {
    console.error('Error assigning spot:', error);
    return NextResponse.json({ error: 'Error al asignar plaza' }, { status: 500 });
  }
}
