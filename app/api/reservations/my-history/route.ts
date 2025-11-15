export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';

// Asegurar que el modelo ParkingSpot esté registrado para populate
const _ensureModels = [ParkingSpot];

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const reservations = await Reservation.find({ userId: session.user.id })
      .populate('parkingSpotId')
      .sort({ date: -1 });

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
