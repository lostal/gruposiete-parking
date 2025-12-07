/**
 * Mongoose populated document types
 *
 * These types provide strong typing for documents returned by Mongoose
 * populate() operations, eliminating the need for `as any` casts.
 */

import type { IReservation } from "@/models/Reservation";
import type { IParkingSpot } from "@/models/ParkingSpot";
import type { Document } from "mongoose";

/**
 * User fields included after populate("userId", "name email")
 */
export interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

/**
 * Reservation with parkingSpotId populated as full IParkingSpot document
 */
export interface IReservationWithSpot extends Omit<
  IReservation,
  "parkingSpotId"
> {
  parkingSpotId: IParkingSpot & Document;
}

/**
 * Reservation with both parkingSpotId and userId populated
 */
export interface IReservationFullyPopulated extends Omit<
  IReservation,
  "parkingSpotId" | "userId"
> {
  parkingSpotId: IParkingSpot & Document;
  userId: PopulatedUser;
}
