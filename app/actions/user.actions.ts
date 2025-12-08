"use server";

import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import Reservation from "@/models/Reservation";
import { ReservationStatus } from "@/types";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { startOfDay } from "date-fns";
import { unassignSpotFromUser } from "@/lib/services/admin.service";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function updateUserAction(name: string): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) return { error: "No autorizado" };

    if (!name || !name.trim()) {
      return { error: "El nombre es requerido" };
    }

    await dbConnect();

    // Use { new: true } to get the updated document and verify update happened
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { name: name.trim() },
      { new: true },
    );

    if (!updatedUser) {
      return { error: "Usuario no encontrado" };
    }

    // Revalidate all paths where user data is displayed
    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true, message: "Nombre actualizado" };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Error al actualizar el perfil" };
  }
}

export async function changePasswordAction(
  current: string,
  newPass: string,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) return { error: "No autorizado" };

    if (!current || !newPass) {
      return { error: "Todos los campos son requeridos" };
    }

    if (newPass.length < 8) {
      return { error: "La contraseña debe tener al menos 8 caracteres" };
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return { error: "Usuario no encontrado" };

    const isValid = await bcrypt.compare(current, user.password);
    if (!isValid) {
      return { error: "Contraseña actual incorrecta" };
    }

    const hashedPassword = await bcrypt.hash(newPass, 12);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: "Contraseña actualizada" };
  } catch (error) {
    console.error("Error changing password:", error);
    return { error: "Error al cambiar la contraseña" };
  }
}

export async function deleteAccountAction(
  password: string,
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session) return { error: "No autorizado" };

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return { error: "Usuario no encontrado" };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { error: "Contraseña incorrecta" };
    }

    // Unassign spot if any
    if (user.assignedParkingSpot) {
      await unassignSpotFromUser(user._id.toString());
    }

    // Cancel all future active reservations to prevent "zombie" reservations
    const today = startOfDay(new Date());
    await Reservation.updateMany(
      {
        userId: user._id,
        date: { $gte: today },
        status: ReservationStatus.ACTIVE,
      },
      { status: ReservationStatus.CANCELLED },
    );

    // Delete the user
    await User.findByIdAndDelete(session.user.id);

    return { success: true, message: "Cuenta eliminada" };
  } catch (error) {
    console.error("Error deleting account:", error);
    return { error: "Error al eliminar la cuenta" };
  }
}
