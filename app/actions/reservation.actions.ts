"use server";

import { auth } from "@/lib/auth/auth";
import { UserRole } from "@/types";
import {
  createReservation,
  cancelReservation,
  getUserHistory,
  ReservationError,
} from "@/lib/services/reservations.service";
import { CreateReservationSchema } from "@/lib/schemas/reservation.schema";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";

import { checkRateLimitRedis } from "@/lib/ratelimit-redis";

export type ActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

export async function createReservationAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { error: "No autorizado" };
    }

    if (session.user.role !== UserRole.GENERAL) {
      return { error: "Solo usuarios generales pueden reservar plazas" };
    }

    // Rate Limit Check
    const limit = await checkRateLimitRedis(
      `reservation_${session.user.id}`,
      "reservacion",
    );

    if (!limit.success) {
      return {
        error: "Demasiadas reservas en poco tiempo. Espera unos minutos.",
      };
    }

    const rawData = {
      parkingSpotId: formData.get("parkingSpotId"),
      date: formData.get("date"),
    };

    const validation = CreateReservationSchema.safeParse(rawData);

    if (!validation.success) {
      return {
        error: "Datos inválidos",
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    await createReservation({
      userId: session.user.id,
      parkingSpotId: validation.data.parkingSpotId,
      date: startOfDay(new Date(validation.data.date)),
    });

    revalidatePath("/dashboard");
    return { success: true, message: "Reserva creada correctamente" };
  } catch (error) {
    if (error instanceof ReservationError) {
      return { error: error.message };
    }
    return { error: "Error al crear la reserva" };
  }
}

export async function cancelReservationAction(
  reservationId: string,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { error: "No autorizado" };
    }

    await cancelReservation(
      reservationId,
      session.user.id,
      session.user.role === UserRole.ADMIN,
    );

    revalidatePath("/dashboard");
    return { success: true, message: "Reserva cancelada correctamente" };
  } catch (error) {
    if (error instanceof ReservationError) {
      return { error: error.message };
    }
    return { error: "Error al cancelar la reserva" };
  }
}

export async function getMyReservationsHistoryAction() {
  const session = await auth();
  if (!session) {
    throw new Error("No autorizado");
  }

  const history = await getUserHistory(session.user.id, true);

  // Serialize dates to strings to match client expectations
  return history.map((h) => ({
    ...h,
    _id: h._id.toString(),
    date: h.date.toISOString(),
    user: {
      ...h.user,
      _id: h.user._id.toString(),
    },
  }));
}
