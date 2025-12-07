"use server";

import {
  getAvailableSpots,
  getAvailableDays,
  getParkingSpotById,
} from "@/lib/services/parking.service";

export async function getAvailableSpotsAction(date: Date) {
  const spots = await getAvailableSpots(date);
  return JSON.parse(JSON.stringify(spots));
}

export async function getAvailableDaysAction(startDate: Date, endDate: Date) {
  const days = await getAvailableDays(startDate, endDate);
  return days;
}

export async function getParkingSpotByIdAction(id: string) {
  const spot = await getParkingSpotById(id);
  return JSON.parse(JSON.stringify(spot));
}
