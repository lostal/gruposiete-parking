export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';
import User from '@/models/User';
import Availability from '@/models/Availability';
import { startOfDay } from 'date-fns';
import { ReservationStatus, UserRole } from '@/types';
import { formatDate } from '@/lib/utils/dates';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const parkingSpotId = searchParams.get('parkingSpotId');
    const upcoming = searchParams.get('upcoming') === 'true';

    await dbConnect();

    const query: any = { status: ReservationStatus.ACTIVE };

    if (userId) {
      query.userId = userId;
    }

    if (parkingSpotId) {
      query.parkingSpotId = parkingSpotId;
    }

    if (upcoming) {
      query.date = { $gte: startOfDay(new Date()) };
    }

    const reservations = await Reservation.find(query)
      .populate('parkingSpotId')
      .populate('userId', 'name email')
      .sort({ date: 1 });

    const formattedReservations = reservations.map((res) => ({
      _id: res._id,
      date: res.date,
      status: res.status,
      createdAt: res.createdAt,
      parkingSpot: res.parkingSpotId,
      user: res.userId,
    }));

    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo usuarios generales pueden reservar
    if (session.user.role !== UserRole.GENERAL) {
      return NextResponse.json(
        { error: 'Solo usuarios generales pueden reservar plazas' },
        { status: 403 },
      );
    }

    const { parkingSpotId, date: dateStr } = await request.json();

    if (!parkingSpotId || !dateStr) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const date = startOfDay(new Date(dateStr));

    // Validar que la fecha sea laborable (L-V)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json(
        { error: 'Solo se pueden hacer reservas para días laborables (L-V)' },
        { status: 400 },
      );
    }

    // Validar que la fecha sea futura
    if (date < startOfDay(new Date())) {
      return NextResponse.json(
        { error: 'No se pueden hacer reservas para fechas pasadas' },
        { status: 400 },
      );
    }

    await dbConnect();

    // Verificar que la plaza está marcada como no disponible
    const availability = await Availability.findOne({
      parkingSpotId,
      date: { $gte: date, $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
      isAvailable: false,
    });

    if (!availability) {
      return NextResponse.json(
        { error: 'Esta plaza no está disponible para reservar en esta fecha' },
        { status: 400 },
      );
    }

    // Verificar que no esté ya reservada (FIFO)
    const existingReservation = await Reservation.findOne({
      parkingSpotId,
      date: { $gte: date, $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
      status: ReservationStatus.ACTIVE,
    });

    if (existingReservation) {
      return NextResponse.json(
        { error: 'Esta plaza ya ha sido reservada por otro usuario' },
        { status: 400 },
      );
    }

    // Crear reserva
    const reservation = await Reservation.create({
      parkingSpotId,
      userId: session.user.id,
      date,
      status: ReservationStatus.ACTIVE,
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('parkingSpotId')
      .populate('userId', 'name email');

    if (!populatedReservation) {
      return NextResponse.json({ error: 'Error al obtener reserva creada' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reservation: {
        _id: populatedReservation._id,
        date: populatedReservation.date,
        parkingSpot: populatedReservation.parkingSpotId,
        user: populatedReservation.userId,
      },
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Error al crear reserva' }, { status: 500 });
  }
}
