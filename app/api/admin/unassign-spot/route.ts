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

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    // Validar que el ID sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await dbConnect();

    // USAR TRANSACCIÓN para evitar inconsistencias
    const session_db = await mongoose.startSession();
    session_db.startTransaction();

    try {
      // Verificar que el usuario exista
      const user = await User.findById(userId).session(session_db);
      if (!user) {
        await session_db.abortTransaction();
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      // Verificar que el usuario tenga una plaza asignada
      if (!user.assignedParkingSpot) {
        await session_db.abortTransaction();
        return NextResponse.json(
          { error: "El usuario no tiene plaza asignada" },
          { status: 400 }
        );
      }

      // Liberar la plaza del usuario
      await ParkingSpot.findByIdAndUpdate(
        user.assignedParkingSpot,
        {
          assignedTo: null,
          assignedToName: null,
        },
        { session: session_db }
      );

      // Quitar la plaza del usuario
      user.assignedParkingSpot = undefined;
      await user.save({ session: session_db });

      // Confirmar transacción
      await session_db.commitTransaction();

      return NextResponse.json({
        success: true,
        message: "Plaza desasignada correctamente",
      });
    } catch (transactionError) {
      await session_db.abortTransaction();
      throw transactionError;
    } finally {
      session_db.endSession();
    }
  } catch (error) {
    console.error("Error unassigning spot:", error);
    return NextResponse.json(
      { error: "Error al desasignar plaza" },
      { status: 500 }
    );
  }
}
