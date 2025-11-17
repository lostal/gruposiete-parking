export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import ParkingSpot from "@/models/ParkingSpot";
import Availability from "@/models/Availability";
import Reservation from "@/models/Reservation";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    const date = startOfDay(new Date(dateParam));

    await dbConnect();

    const unavailable = await Availability.find({
      date: { $gte: date, $lt: endOfDay(date) },
      isAvailable: false,
    }).select("parkingSpotId");

    const reserved = await Reservation.find({
      date: { $gte: date, $lt: endOfDay(date) },
      status: "ACTIVE",
    }).select("parkingSpotId");

    const unavailableIds = unavailable.map((a) => a.parkingSpotId.toString());
    const reservedIds = reserved.map((r) => r.parkingSpotId.toString());

    const availableSpotIds = unavailableIds.filter(
      (id) => !reservedIds.includes(id)
    );

    const availableSpots = await ParkingSpot.find({
      _id: { $in: availableSpotIds },
    }).sort({ number: 1 });

    return NextResponse.json(availableSpots);
  } catch (error) {
    console.error("Error fetching available spots:", error);
    return NextResponse.json(
      { error: "Error al obtener plazas disponibles" },
      { status: 500 }
    );
  }
}
