"use server";

import { auth } from "@/lib/auth/auth";
import { UserRole } from "@/types";
import {
  updateAvailability,
  AvailabilityError,
} from "@/lib/services/availability.service";
import { revalidatePath } from "next/cache";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type UpdateAvailabilityPayload = {
  parkingSpotId: string;
  dates: string[];
  isAvailable: boolean;
};

export async function updateAvailabilityAction(
  prevState: ActionState,
  payload: UpdateAvailabilityPayload,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) {
      return { error: "No autorizado" };
    }

    if (
      session.user.role !== UserRole.DIRECCION &&
      session.user.role !== UserRole.ADMIN
    ) {
      return { error: "No autorizado" };
    }

    await updateAvailability({
      parkingSpotId: payload.parkingSpotId,
      dates: payload.dates,
      isAvailable: payload.isAvailable,
      userId: session.user.id,
      userRole: session.user.role,
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Disponibilidad actualizada correctamente",
    };
  } catch (error) {
    if (error instanceof AvailabilityError) {
      return { error: error.message };
    }
    return { error: "Error al actualizar la disponibilidad" };
  }
}
