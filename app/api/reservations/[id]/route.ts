export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/mongodb';
import Reservation from '@/models/Reservation';
import ParkingSpot from '@/models/ParkingSpot';
import User from '@/models/User';
import { ReservationStatus, UserRole } from '@/types';
import { sendEmail, getNewSpotsAvailableEmail } from '@/lib/email/resend';
import { formatDate } from '@/lib/utils/dates';

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

    // Enviar emails a usuarios GENERAL notificando que hay una plaza disponible
    try {
      const generalUsers = await User.find({ role: UserRole.GENERAL }).select('name email');

      if (parkingSpot && generalUsers.length > 0) {
        const spotInfo = `${parkingSpot.number} (${
          parkingSpot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'
        })`;

        // Enviar email a cada usuario general
        for (const user of generalUsers) {
          await sendEmail({
            to: user.email,
            subject: '¡Nuevas plazas disponibles! - Gruposiete Parking',
            html: getNewSpotsAvailableEmail(user.name, formatDate(reservationDate), [spotInfo]),
          });
        }
      }
    } catch (emailError) {
      console.error('Error sending cancellation emails:', emailError);
      // No fallar la operación si falla el email
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json({ error: 'Error al cancelar reserva' }, { status: 500 });
  }
}
