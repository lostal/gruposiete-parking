"use server";

import { auth } from "@/lib/auth/auth";
import { UserRole } from "@/types";
import {
  assignSpotToUser,
  unassignSpotFromUser,
} from "@/lib/services/admin.service";
import { revalidatePath } from "next/cache";

export async function assignSpotAction(userId: string, spotId: string) {
  const session = await auth();
  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    await assignSpotToUser(userId, spotId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error al asignar plaza",
    };
  }
}

export async function unassignSpotAction(userId: string) {
  const session = await auth();
  if (!session || session.user.role !== UserRole.ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    await unassignSpotFromUser(userId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Error al desasignar plaza",
    };
  }
}
