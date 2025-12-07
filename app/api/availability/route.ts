export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import Availability from "@/models/Availability";
import Reservation from "@/models/Reservation";
import ParkingSpot from "@/models/ParkingSpot";
import { startOfDay, endOfDay } from "date-fns";
import { UserRole } from "@/types";
import {
  sendEmail,
  getNewSpotsAvailableDistributionEmail,
} from "@/lib/email/resend";
import { formatDate } from "@/lib/utils/dates";
import mongoose from "mongoose";
import { AVAILABILITY_CONSTANTS, isWeekday } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parkingSpotId = searchParams.get("parkingSpotId");

    if (!parkingSpotId) {
      return NextResponse.json(
        { error: "parkingSpotId requerido" },
        { status: 400 },
      );
    }

    await dbConnect();

    const availability = await Availability.find({
      parkingSpotId,
      date: { $gte: startOfDay(new Date()) },
    }).sort({ date: 1 });

    return NextResponse.json(availability);
  } catch (error) {
    logger.error("Error fetching availability", error as Error);
    return NextResponse.json(
      { error: "Error al obtener disponibilidad" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (
      session.user.role !== UserRole.DIRECCION &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { parkingSpotId, dates, isAvailable } = await request.json();

    if (!parkingSpotId || !dates || !Array.isArray(dates)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(parkingSpotId)) {
      return NextResponse.json(
        { error: "ID de plaza inválido" },
        { status: 400 },
      );
    }

    if (dates.length > AVAILABILITY_CONSTANTS.MAX_DATES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Máximo ${AVAILABILITY_CONSTANTS.MAX_DATES_PER_REQUEST} fechas por solicitud`,
        },
        { status: 400 },
      );
    }

    const uniqueDates = new Set(dates);
    if (uniqueDates.size !== dates.length) {
      return NextResponse.json(
        { error: "Hay fechas duplicadas en la solicitud" },
        { status: 400 },
      );
    }

    await dbConnect();

    if (session.user.role === UserRole.DIRECCION) {
      const spot = await ParkingSpot.findById(parkingSpotId);
      if (!spot) {
        return NextResponse.json(
          { error: "Plaza no encontrada" },
          { status: 404 },
        );
      }

      if (!spot.assignedTo || spot.assignedTo.toString() !== session.user.id) {
        return NextResponse.json(
          {
            error:
              "Solo puedes marcar disponibilidad de tu propia plaza asignada",
          },
          { status: 403 },
        );
      }
    }

    if (isAvailable) {
      for (const dateStr of dates) {
        const date = startOfDay(new Date(dateStr));
        const hasReservation = await Reservation.findOne({
          parkingSpotId,
          date: { $gte: date, $lt: endOfDay(date) },
          status: "ACTIVE",
        });

        if (hasReservation) {
          return NextResponse.json(
            {
              error:
                "No se puede cambiar. Ya hay reservas activas para algunas fechas.",
            },
            { status: 400 },
          );
        }
      }
    }

    const results: any[] = [];
    const newlyAvailableDates: Date[] = [];
    const today = startOfDay(new Date());

    for (const dateStr of dates) {
      const date = startOfDay(new Date(dateStr));

      if (date < today) {
        return NextResponse.json(
          { error: "No se puede marcar disponibilidad para fechas pasadas" },
          { status: 400 },
        );
      }

      if (!isWeekday(date)) {
        return NextResponse.json(
          {
            error:
              "Solo se puede marcar disponibilidad para días laborables (Lunes a Viernes)",
          },
          { status: 400 },
        );
      }

      const existingAvailability = await Availability.findOne({
        parkingSpotId,
        date,
      });

      const wasAvailableForReservation =
        existingAvailability && existingAvailability.isAvailable === false;

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

      if (!isAvailable && !wasAvailableForReservation) {
        newlyAvailableDates.push(date);
      }
    }

    if (newlyAvailableDates.length > 0) {
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

            const parkingSpot = await ParkingSpot.findById(parkingSpotId);

            if (parkingSpot) {
              const spotInfo = `${parkingSpot.number} (${
                parkingSpot.location === "SUBTERRANEO"
                  ? "Subterráneo"
                  : "Exterior"
              })`;

              // Agrupar todas las fechas
              const formattedDates = newlyAvailableDates.map((date) =>
                formatDate(date),
              );
              const datesList =
                formattedDates.length === 1
                  ? formattedDates[0]
                  : formattedDates.slice(0, -1).join(", ") +
                    " y " +
                    formattedDates[formattedDates.length - 1];

              // Enviar UN SOLO email al correo de distribución (sin personalización de nombre)
              try {
                await sendEmail({
                  to: distributionEmail,
                  subject: "¡Nuevas plazas disponibles! - Gruposiete Parking",
                  html: getNewSpotsAvailableDistributionEmail(datesList, [
                    spotInfo,
                  ]),
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
              "Error sending availability emails",
              emailError as Error,
            );
          }
        })
        .catch((error) => {
          logger.error("Error in background email task", error as Error);
        });
    }

    return NextResponse.json({ success: true, availability: results });
  } catch (error) {
    logger.error("Error updating availability", error as Error);
    return NextResponse.json(
      { error: "Error al actualizar disponibilidad" },
      { status: 500 },
    );
  }
}
