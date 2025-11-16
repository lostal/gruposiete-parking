export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';
import { startOfDay } from 'date-fns';

// Asegurar que el modelo ParkingSpot esté registrado para populate
const _ensureModels = [ParkingSpot];

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    // Solo mostrar reservas futuras (desde hoy en adelante)
    const today = startOfDay(new Date());

    const reservations = await Reservation.find({
      userId: session.user.id,
      date: { $gte: today },
    })
      .populate('parkingSpotId')
      .sort({ date: 1 }); // Ordenar de más cercana a más lejana

    const formattedReservations = reservations.map((res) => ({
      _id: res._id,
      date: res.date,
      status: res.status,
      createdAt: res.createdAt,
      parkingSpot: res.parkingSpotId,
    }));

    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
