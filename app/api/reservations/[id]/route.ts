export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import Reservation from "@/models/Reservation";
import ParkingSpot from "@/models/ParkingSpot";
import { ReservationStatus, UserRole } from "@/types";
import {
  sendEmail,
  getNewSpotsAvailableDistributionEmail,
} from "@/lib/email/resend";
import { formatDate } from "@/lib/utils/dates";
import { IReservationWithSpot } from "@/types/mongoose.types";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

// Asegurar que los modelos estén registrados para populate
const _ensureModels = [ParkingSpot];

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID de reserva inválido" },
        { status: 400 },
      );
    }

    await dbConnect();

    const reservation = (await Reservation.findById(id).populate(
      "parkingSpotId",
    )) as IReservationWithSpot | null;

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 },
      );
    }

    // Solo el dueño o admin pueden cancelar
    if (
      reservation.userId.toString() !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Guardar datos antes de cancelar (para enviar emails)
    const parkingSpot = reservation.parkingSpotId;
    const reservationDate = reservation.date;

    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save();

    // Enviar email a lista de distribución notificando que hay una plaza disponible
    // Usar Promise en lugar de setImmediate para compatibilidad con Node.js moderno y Edge Runtime
    Promise.resolve()
      .then(async () => {
        try {
          const distributionEmail = process.env.DISTRIBUTION_EMAIL;

          // TODO: Habilitar cuando se tenga el correo de distribución configurado
          if (!distributionEmail) {
            logger.warn(
              "DISTRIBUTION_EMAIL no configurado. Email de notificación no enviado.",
            );
            return;
          }

          if (parkingSpot) {
            const spotInfo = `${parkingSpot.number} (${
              parkingSpot.location === "SUBTERRANEO"
                ? "Subterráneo"
                : "Exterior"
            })`;

            // Enviar UN SOLO email al correo de distribución (sin personalización de nombre)
            try {
              await sendEmail({
                to: distributionEmail,
                subject: "¡Nuevas plazas disponibles! - Gruposiete Parking",
                html: getNewSpotsAvailableDistributionEmail(
                  formatDate(reservationDate),
                  [spotInfo],
                ),
              });
            } catch (emailError) {
              logger.error(
                "Error sending distribution email",
                emailError as Error,
              );
            }
          }
        } catch (emailError) {
          logger.error(
            "Error sending cancellation emails",
            emailError as Error,
          );
        }
      })
      .catch((error) => {
        logger.error("Error in background email task", error as Error);
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error cancelling reservation", error as Error);
    return NextResponse.json(
      { error: "Error al cancelar reserva" },
      { status: 500 },
    );
  }
}
