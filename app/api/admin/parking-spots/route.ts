export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import ParkingSpot from "@/models/ParkingSpot";
import { UserRole } from "@/types";

export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await dbConnect();

    const spots = await ParkingSpot.find().sort({ number: 1 });

    return NextResponse.json(spots);
  } catch (error) {
    console.error("Error fetching parking spots:", error);
    return NextResponse.json(
      { error: "Error al obtener plazas" },
      { status: 500 }
    );
  }
}
