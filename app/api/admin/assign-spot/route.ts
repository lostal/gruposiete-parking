export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import ParkingSpot from "@/models/ParkingSpot";
import { UserRole } from "@/types";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { userId, spotId } = await request.json();

    if (!userId || !spotId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Validar que los IDs sean ObjectIds válidos
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(spotId)
    ) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await dbConnect();

    // USAR TRANSACCIÓN para evitar inconsistencias
    const session_db = await mongoose.startSession();
    session_db.startTransaction();

    try {
      // Verificar que el usuario exista y sea de Dirección
      const user = await User.findById(userId).session(session_db);
      if (!user) {
        await session_db.abortTransaction();
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 },
        );
      }

      if (user.role !== UserRole.DIRECCION) {
        await session_db.abortTransaction();
        return NextResponse.json(
          { error: "Solo se pueden asignar plazas a usuarios de Dirección" },
          { status: 400 },
        );
      }

      // Verificar que la plaza existe
      const spot = await ParkingSpot.findById(spotId).session(session_db);
      if (!spot) {
        await session_db.abortTransaction();
        return NextResponse.json(
          { error: "Plaza no encontrada" },
          { status: 404 },
        );
      }

      // Si el usuario ya tenía una plaza asignada, liberarla
      if (user.assignedParkingSpot) {
        await ParkingSpot.findByIdAndUpdate(
          user.assignedParkingSpot,
          {
            assignedTo: null,
            assignedToName: null,
          },
          { session: session_db },
        );
      }

      // Si la plaza estaba asignada a otro usuario, desasignarla
      if (spot.assignedTo) {
        await User.findByIdAndUpdate(
          spot.assignedTo,
          {
            assignedParkingSpot: null,
          },
          { session: session_db },
        );
      }

      // Asignar la plaza al usuario
      user.assignedParkingSpot = spot._id as any;
      await user.save({ session: session_db });

      spot.assignedTo = user._id as any;
      spot.assignedToName = user.name;
      await spot.save({ session: session_db });

      // Confirmar transacción
      await session_db.commitTransaction();

      return NextResponse.json({
        success: true,
        message: "Plaza asignada correctamente",
      });
    } catch (transactionError) {
      await session_db.abortTransaction();
      throw transactionError;
    } finally {
      session_db.endSession();
    }
  } catch (error) {
    console.error("Error assigning spot:", error);
    return NextResponse.json(
      { error: "Error al asignar plaza" },
      { status: 500 },
    );
  }
}
