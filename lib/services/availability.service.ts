import mongoose from "mongoose";
import { startOfDay, endOfDay } from "date-fns";
import dbConnect from "@/lib/db/mongodb";
import Availability from "@/models/Availability";
import Reservation from "@/models/Reservation";
import ParkingSpot from "@/models/ParkingSpot";
import { UserRole } from "@/types";
import { logger } from "@/lib/logger";
import {
  sendEmail,
  getNewSpotsAvailableDistributionEmail,
} from "@/lib/email/resend";
import { formatDate } from "@/lib/utils/dates";
import { AVAILABILITY_CONSTANTS, isWeekday } from "@/lib/constants";

export interface UpdateAvailabilityParams {
  parkingSpotId: string;
  dates: string[];
  isAvailable: boolean;
  userId: string;
  userRole: UserRole;
}

export class AvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvailabilityError";
  }
}

export async function updateAvailability(
  params: UpdateAvailabilityParams,
): Promise<void> {
  const { parkingSpotId, dates, isAvailable, userId, userRole } = params;

  if (!parkingSpotId || !dates || !Array.isArray(dates)) {
    throw new AvailabilityError("Datos inválidos");
  }

  if (!mongoose.Types.ObjectId.isValid(parkingSpotId)) {
    throw new AvailabilityError("ID de plaza inválido");
  }

  if (dates.length > AVAILABILITY_CONSTANTS.MAX_DATES_PER_REQUEST) {
    throw new AvailabilityError(
      `Máximo ${AVAILABILITY_CONSTANTS.MAX_DATES_PER_REQUEST} fechas por solicitud`,
    );
  }

  const uniqueDates = new Set(dates);
  if (uniqueDates.size !== dates.length) {
    throw new AvailabilityError("Hay fechas duplicadas en la solicitud");
  }

  await dbConnect();

  if (userRole === UserRole.DIRECCION) {
    const spot = await ParkingSpot.findById(parkingSpotId);
    if (!spot) {
      throw new AvailabilityError("Plaza no encontrada");
    }

    if (!spot.assignedTo || spot.assignedTo.toString() !== userId) {
      throw new AvailabilityError(
        "Solo puedes marcar disponibilidad de tu propia plaza asignada",
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
        throw new AvailabilityError(
          "No se puede cambiar. Ya hay reservas activas para algunas fechas.",
        );
      }
    }
  }

  const newlyAvailableDates: Date[] = [];
  const today = startOfDay(new Date());

  for (const dateStr of dates) {
    const date = startOfDay(new Date(dateStr));

    if (date < today) {
      throw new AvailabilityError(
        "No se puede marcar disponibilidad para fechas pasadas",
      );
    }

    if (!isWeekday(date)) {
      throw new AvailabilityError(
        "Solo se puede marcar disponibilidad para días laborables (Lunes a Viernes)",
      );
    }

    const existingAvailability = await Availability.findOne({
      parkingSpotId,
      date,
    });

    const wasAvailableForReservation =
      existingAvailability && existingAvailability.isAvailable === false;

    await Availability.findOneAndUpdate(
      { parkingSpotId, date },
      {
        parkingSpotId,
        date,
        isAvailable,
        markedBy: userId,
      },
      { upsert: true, new: true },
    );

    if (!isAvailable && !wasAvailableForReservation) {
      newlyAvailableDates.push(date);
    }
  }

  if (newlyAvailableDates.length > 0) {
    Promise.resolve()
      .then(async () => {
        try {
          const distributionEmail = process.env.DISTRIBUTION_EMAIL;

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

            const formattedDates = newlyAvailableDates.map((date) =>
              formatDate(date),
            );
            const datesList =
              formattedDates.length === 1
                ? formattedDates[0]
                : formattedDates.slice(0, -1).join(", ") +
                  " y " +
                  formattedDates[formattedDates.length - 1];

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
}

import { IAvailability } from "@/models/Availability";

export async function getSpotAvailability(
  parkingSpotId: string,
): Promise<IAvailability[]> {
  await dbConnect();
  return Availability.find({
    parkingSpotId,
    date: { $gte: startOfDay(new Date()) },
  })
    .sort({ date: 1 })
    .lean();
}
