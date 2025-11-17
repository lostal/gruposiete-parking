export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import ParkingSpot from "@/models/ParkingSpot";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await dbConnect();

    const parkingSpot = await ParkingSpot.findById(params.id);

    if (!parkingSpot) {
      return NextResponse.json(
        { error: "Plaza no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(parkingSpot);
  } catch (error) {
    console.error("Error fetching parking spot:", error);
    return NextResponse.json(
      { error: "Error al obtener plaza" },
      { status: 500 }
    );
  }
}
