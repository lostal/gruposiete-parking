import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import Reservation from "@/models/Reservation";
import Availability from "@/models/Availability";
import ParkingSpot from "@/models/ParkingSpot";
import { UserRole } from "@/types";
import { logger, getRequestContext } from "@/lib/logger";
import bcrypt from "bcryptjs";

const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").trim(),
});

// PATCH: Actualizar nombre de usuario
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Los admin no pueden modificar su perfil
    if (session.user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Los administradores no pueden modificar su perfil" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    user.name = validatedData.name;
    await user.save();

    logger.info("Perfil actualizado", {
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json({
      message: "Perfil actualizado correctamente",
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }

    logger.error(
      "Error al actualizar perfil",
      error as Error,
      getRequestContext(request),
    );
    return NextResponse.json(
      { error: "Error al actualizar el perfil" },
      { status: 500 },
    );
  }
}

// DELETE: Eliminar cuenta de usuario
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Los admin no pueden eliminar su cuenta
    if (session.user.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Los administradores no pueden eliminar su cuenta" },
        { status: 403 },
      );
    }

    // Obtener contraseña del body para confirmar
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Se requiere la contraseña para confirmar la eliminación" },
        { status: 400 },
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 },
      );
    }

    // Eliminar según el rol
    if (user.role === UserRole.GENERAL) {
      // Eliminar todas las reservas del usuario
      await Reservation.deleteMany({ userId: user._id });
      logger.info("Reservas eliminadas para usuario GENERAL", {
        userId: user._id.toString(),
      });
    } else if (user.role === UserRole.DIRECCION) {
      // Eliminar todas las disponibilidades marcadas por el usuario
      await Availability.deleteMany({ markedBy: user._id });

      // Liberar la plaza asignada
      if (user.assignedParkingSpot) {
        await ParkingSpot.findByIdAndUpdate(user.assignedParkingSpot, {
          $unset: { assignedTo: "" },
        });
        logger.info("Plaza liberada para usuario DIRECCION", {
          userId: user._id.toString(),
          spotId: user.assignedParkingSpot.toString(),
        });
      }
    }

    // Eliminar el usuario
    await User.findByIdAndDelete(user._id);

    logger.info("Usuario eliminado", {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      message: "Tu cuenta ha sido eliminada correctamente",
    });
  } catch (error) {
    logger.error(
      "Error al eliminar usuario",
      error as Error,
      getRequestContext(request),
    );
    return NextResponse.json(
      { error: "Error al eliminar la cuenta" },
      { status: 500 },
    );
  }
}
