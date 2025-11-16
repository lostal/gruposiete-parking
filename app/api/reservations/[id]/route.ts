export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';
import { ReservationStatus, UserRole } from '@/types';
import { sendEmail, getNewSpotsAvailableDistributionEmail } from '@/lib/email/resend';
import { formatDate } from '@/lib/utils/dates';

// Asegurar que los modelos estén registrados para populate
const _ensureModels = [ParkingSpot];

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const reservation = await Reservation.findById(params.id).populate('parkingSpotId');

    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // Solo el dueño o admin pueden cancelar
    if (reservation.userId.toString() !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Guardar datos antes de cancelar (para enviar emails)
    const parkingSpot = reservation.parkingSpotId as any;
    const reservationDate = reservation.date;

    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save();

    // Enviar email a lista de distribución notificando que hay una plaza disponible
    setImmediate(async () => {
      try {
        const distributionEmail = process.env.DISTRIBUTION_EMAIL;

        // TODO: Habilitar cuando se tenga el correo de distribución configurado
        if (!distributionEmail) {
          console.log('⚠️ DISTRIBUTION_EMAIL no configurado. Email de notificación no enviado.');
          return;
        }

        if (parkingSpot) {
          const spotInfo = `${parkingSpot.number} (${
            parkingSpot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'
          })`;

          // Enviar UN SOLO email al correo de distribución (sin personalización de nombre)
          try {
            await sendEmail({
              to: distributionEmail,
              subject: '¡Nuevas plazas disponibles! - Gruposiete Parking',
              html: getNewSpotsAvailableDistributionEmail(formatDate(reservationDate), [spotInfo]),
            });
          } catch (emailError) {
            console.error('Error sending distribution email:', emailError);
          }
        }
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json({ error: 'Error al cancelar reserva' }, { status: 500 });
  }
}
