import dbConnect from "@/lib/db/mongodb";
import ParkingSpot, { IParkingSpot } from "@/models/ParkingSpot";
import Availability from "@/models/Availability";
import Reservation from "@/models/Reservation";
import { startOfDay, endOfDay, format } from "date-fns";

export async function getAvailableDays(
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  await dbConnect();

  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  end.setHours(23, 59, 59, 999);

  // Defined type to avoid any
  type SpotDate = { parkingSpotId: { toString(): string }; date: Date };

  // Plazas donde el dueño NO las usará (disponibles para reservar)
  const availableByDate = (await Availability.find({
    date: { $gte: start, $lte: end },
    ownerIsUsing: false,
  })
    .select("parkingSpotId date")
    .lean()) as unknown as SpotDate[];

  const reservationsByDate = (await Reservation.find({
    date: { $gte: start, $lte: end },
    status: "ACTIVE",
  })
    .select("parkingSpotId date")
    .lean()) as unknown as SpotDate[];

  const dateMap = new Map<
    string,
    { available: Set<string>; reserved: Set<string> }
  >();

  availableByDate.forEach((avail) => {
    const dateKey = format(new Date(avail.date), "yyyy-MM-dd");
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { available: new Set(), reserved: new Set() });
    }
    dateMap.get(dateKey)!.available.add(avail.parkingSpotId.toString());
  });

  reservationsByDate.forEach((res) => {
    const dateKey = format(new Date(res.date), "yyyy-MM-dd");
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { available: new Set(), reserved: new Set() });
    }
    dateMap.get(dateKey)!.reserved.add(res.parkingSpotId.toString());
  });

  const daysWithAvailability: string[] = [];

  dateMap.forEach((data, dateKey) => {
    const availableSpots = Array.from(data.available).filter(
      (spotId) => !data.reserved.has(spotId),
    );
    if (availableSpots.length > 0) {
      daysWithAvailability.push(dateKey);
    }
  });

  return daysWithAvailability;
}

export async function getAvailableSpots(date: Date): Promise<IParkingSpot[]> {
  await dbConnect();
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Plazas donde el dueño NO las usará (disponibles para reservar)
  const available = await Availability.find({
    date: { $gte: dayStart, $lt: dayEnd },
    ownerIsUsing: false,
  }).select("parkingSpotId");

  const reserved = await Reservation.find({
    date: { $gte: dayStart, $lt: dayEnd },
    status: "ACTIVE",
  }).select("parkingSpotId");

  const availableIds = available.map((a) => a.parkingSpotId.toString());
  const reservedIds = reserved.map((r) => r.parkingSpotId.toString());

  const availableSpotIds = availableIds.filter(
    (id) => !reservedIds.includes(id),
  );

  const availableSpots = await ParkingSpot.find({
    _id: { $in: availableSpotIds },
  })
    .sort({ number: 1 })
    .lean();

  return availableSpots as unknown as IParkingSpot[];
}

export async function getParkingSpotById(
  id: string,
): Promise<IParkingSpot | null> {
  await dbConnect();
  const spot = await ParkingSpot.findById(id).lean();
  return spot as unknown as IParkingSpot | null;
}
