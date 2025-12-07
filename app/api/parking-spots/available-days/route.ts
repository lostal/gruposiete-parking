export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import Availability from "@/models/Availability";
import Reservation from "@/models/Reservation";
import { startOfDay, format } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Fechas de inicio y fin requeridas" },
        { status: 400 },
      );
    }

    const startDate = startOfDay(new Date(startDateParam));
    const endDate = startOfDay(new Date(endDateParam));
    endDate.setHours(23, 59, 59, 999);

    await dbConnect();

    // Obtener todas las plazas marcadas como no disponibles en el rango
    const unavailableByDate = await Availability.find({
      date: { $gte: startDate, $lte: endDate },
      isAvailable: false,
    }).select("parkingSpotId date");

    // Obtener todas las reservas activas en el rango
    const reservationsByDate = await Reservation.find({
      date: { $gte: startDate, $lte: endDate },
      status: "ACTIVE",
    }).select("parkingSpotId date");

    // Agrupar por fecha
    const dateMap = new Map<
      string,
      { unavailable: Set<string>; reserved: Set<string> }
    >();

    unavailableByDate.forEach((avail) => {
      const dateKey = format(new Date(avail.date), "yyyy-MM-dd");
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { unavailable: new Set(), reserved: new Set() });
      }
      dateMap.get(dateKey)!.unavailable.add(avail.parkingSpotId.toString());
    });

    reservationsByDate.forEach((res) => {
      const dateKey = format(new Date(res.date), "yyyy-MM-dd");
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { unavailable: new Set(), reserved: new Set() });
      }
      dateMap.get(dateKey)!.reserved.add(res.parkingSpotId.toString());
    });

    // Filtrar días que tienen plazas disponibles (unavailable pero no todas reservadas)
    const daysWithAvailability: string[] = [];

    dateMap.forEach((data, dateKey) => {
      const availableSpots = Array.from(data.unavailable).filter(
        (spotId) => !data.reserved.has(spotId),
      );
      if (availableSpots.length > 0) {
        daysWithAvailability.push(dateKey);
      }
    });

    return NextResponse.json(daysWithAvailability);
  } catch (error) {
    console.error("Error fetching available days:", error);
    return NextResponse.json(
      { error: "Error al obtener días con disponibilidad" },
      { status: 500 },
    );
  }
}
