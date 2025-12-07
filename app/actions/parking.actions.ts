"use server";

import {
  getAvailableSpots,
  getAvailableDays,
  getParkingSpotById,
} from "@/lib/services/parking.service";

export async function getAvailableSpotsAction(dateString: string) {
  // Create date from "YYYY-MM-DD" string (treated as UTC midnight by default in ISO format)
  // But to be safe and avoid timezone issues, we can just use the string if the service supported it,
  // or construct it carefully.
  // new Date("2023-10-09") -> UTC midnight.
  const date = new Date(dateString);
  const spots = await getAvailableSpots(date);
  return JSON.parse(JSON.stringify(spots));
}

export async function getAvailableDaysAction(
  startDateString: string,
  endDateString: string,
) {
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  const days = await getAvailableDays(startDate, endDate);
  return days;
}

export async function getParkingSpotByIdAction(id: string) {
  const spot = await getParkingSpotById(id);
  return JSON.parse(JSON.stringify(spot));
}
