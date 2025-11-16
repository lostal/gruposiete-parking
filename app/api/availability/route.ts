export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Availability from '@/models/Availability';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';
import { startOfDay, endOfDay } from 'date-fns';
import { UserRole } from '@/types';
import { sendEmail, getNewSpotsAvailableDistributionEmail } from '@/lib/email/resend';
import { formatDate } from '@/lib/utils/dates';
import mongoose from 'mongoose';

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

    // Validar que parkingSpotId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(parkingSpotId)) {
      return NextResponse.json({ error: 'ID de plaza inválido' }, { status: 400 });
    }

    await dbConnect();

    // SEGURIDAD CRÍTICA: Verificar que el usuario de Dirección solo pueda marcar su propia plaza
    if (session.user.role === UserRole.DIRECCION) {
      const spot = await ParkingSpot.findById(parkingSpotId);
      if (!spot) {
        return NextResponse.json({ error: 'Plaza no encontrada' }, { status: 404 });
      }

      // Verificar que la plaza esté asignada al usuario actual
      if (!spot.assignedTo || spot.assignedTo.toString() !== session.user.id) {
        return NextResponse.json(
          { error: 'Solo puedes marcar disponibilidad de tu propia plaza asignada' },
          { status: 403 },
        );
      }
    }

    // Si se quiere marcar como disponible, verificar que no haya reservas
    if (isAvailable) {
      for (const dateStr of dates) {
        const date = startOfDay(new Date(dateStr));
        const hasReservation = await Reservation.findOne({
          parkingSpotId,
          date: { $gte: date, $lt: endOfDay(date) },
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

    const results: any[] = [];
    const newlyAvailableDates: Date[] = [];

    for (const dateStr of dates) {
      const date = startOfDay(new Date(dateStr));

      // Verificar si ya existía
      const existingAvailability = await Availability.findOne({ parkingSpotId, date });

      // CORRECCIÓN DE LÓGICA:
      // - isAvailable=false significa "disponible para reservar" (plaza libre)
      // - isAvailable=true significa "no disponible para reservar" (plaza ocupada por el dueño)
      const wasAvailableForReservation =
        existingAvailability && existingAvailability.isAvailable === false;

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

      // Si se marcó como disponible para reservar (isAvailable=false) y antes NO lo estaba
      if (!isAvailable && !wasAvailableForReservation) {
        newlyAvailableDates.push(date);
      }
    }

    // Enviar email a lista de distribución si hay plazas nuevamente disponibles
    if (newlyAvailableDates.length > 0) {
      // NO BLOQUEAR la respuesta por emails - ejecutar en background
      // Usar Promise en lugar de setImmediate para compatibilidad con Node.js moderno y Edge Runtime
      Promise.resolve()
        .then(async () => {
          try {
            const distributionEmail = process.env.DISTRIBUTION_EMAIL;

            // TODO: Habilitar cuando se tenga el correo de distribución configurado
            if (!distributionEmail) {
              console.log(
                '⚠️ DISTRIBUTION_EMAIL no configurado. Email de notificación no enviado.',
              );
              return;
            }

            const parkingSpot = await ParkingSpot.findById(parkingSpotId);

            if (parkingSpot) {
              const spotInfo = `${parkingSpot.number} (${
                parkingSpot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'
              })`;

              // Agrupar todas las fechas
              const formattedDates = newlyAvailableDates.map((date) => formatDate(date));
              const datesList =
                formattedDates.length === 1
                  ? formattedDates[0]
                  : formattedDates.slice(0, -1).join(', ') +
                    ' y ' +
                    formattedDates[formattedDates.length - 1];

              // Enviar UN SOLO email al correo de distribución (sin personalización de nombre)
              try {
                await sendEmail({
                  to: distributionEmail,
                  subject: '¡Nuevas plazas disponibles! - Gruposiete Parking',
                  html: getNewSpotsAvailableDistributionEmail(datesList, [spotInfo]),
                });
              } catch (emailError) {
                console.error('Error sending distribution email:', emailError);
              }
            }
          } catch (emailError) {
            console.error('Error sending availability emails:', emailError);
          }
        })
        .catch((error) => {
          console.error('Error in background email task:', error);
        });
    }

    return NextResponse.json({ success: true, availability: results });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json({ error: 'Error al actualizar disponibilidad' }, { status: 500 });
  }
}
