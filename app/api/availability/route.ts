export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Availability from '@/models/Availability';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';
import User from '@/models/User';
import { startOfDay } from 'date-fns';
import { UserRole } from '@/types';
import { sendEmail, getNewSpotsAvailableEmail } from '@/lib/email/resend';
import { formatDate } from '@/lib/utils/dates';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parkingSpotId = searchParams.get('parkingSpotId');

    if (!parkingSpotId) {
      return NextResponse.json({ error: 'parkingSpotId requerido' }, { status: 400 });
    }

    await dbConnect();

    const availability = await Availability.find({
      parkingSpotId,
      date: { $gte: startOfDay(new Date()) },
    }).sort({ date: 1 });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Error al obtener disponibilidad' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo Dirección puede marcar disponibilidad
    if (session.user.role !== UserRole.DIRECCION && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { parkingSpotId, dates, isAvailable } = await request.json();

    if (!parkingSpotId || !dates || !Array.isArray(dates)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();

    // Si se quiere marcar como disponible, verificar que no haya reservas
    if (isAvailable) {
      for (const dateStr of dates) {
        const date = startOfDay(new Date(dateStr));
        const hasReservation = await Reservation.findOne({
          parkingSpotId,
          date: { $gte: date, $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
          status: 'ACTIVE',
        });

        if (hasReservation) {
          return NextResponse.json(
            { error: 'No se puede cambiar. Ya hay reservas activas para algunas fechas.' },
            { status: 400 },
          );
        }
      }
    }

    const results = [];
    const newlyAvailableDates = [];

    for (const dateStr of dates) {
      const date = startOfDay(new Date(dateStr));

      // Verificar si ya existía y estaba marcada como no disponible
      const existingAvailability = await Availability.findOne({ parkingSpotId, date });
      const wasUnavailable = existingAvailability && existingAvailability.isAvailable === true;

      // Upsert: actualizar si existe, crear si no existe
      const availability = await Availability.findOneAndUpdate(
        { parkingSpotId, date },
        {
          parkingSpotId,
          date,
          isAvailable,
          markedBy: session.user.id,
        },
        { upsert: true, new: true },
      );

      results.push(availability);

      // Si se marcó como disponible para reservar (isAvailable=false) y antes no lo estaba
      if (!isAvailable && (wasUnavailable || !existingAvailability)) {
        newlyAvailableDates.push(date);
      }
    }

    // Enviar emails a usuarios GENERAL si hay plazas nuevamente disponibles
    if (newlyAvailableDates.length > 0) {
      try {
        const parkingSpot = await ParkingSpot.findById(parkingSpotId);
        const generalUsers = await User.find({ role: UserRole.GENERAL }).select('name email');

        if (parkingSpot && generalUsers.length > 0) {
          const spotInfo = `${parkingSpot.number} (${
            parkingSpot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'
          })`;

          // Agrupar todas las fechas en un solo email por usuario
          const formattedDates = newlyAvailableDates.map((date) => formatDate(date));
          const datesList =
            formattedDates.length === 1
              ? formattedDates[0]
              : formattedDates.slice(0, -1).join(', ') +
                ' y ' +
                formattedDates[formattedDates.length - 1];

          // Enviar UN email a cada usuario general con todas las fechas
          for (const user of generalUsers) {
            await sendEmail({
              to: user.email,
              subject: '¡Nuevas plazas disponibles! - Gruposiete Parking',
              html: getNewSpotsAvailableEmail(user.name, datesList, [spotInfo]),
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending availability emails:', emailError);
        // No fallar la operación si falla el email
      }
    }

    return NextResponse.json({ success: true, availability: results });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json({ error: 'Error al actualizar disponibilidad' }, { status: 500 });
  }
}
