// Enums
export enum UserRole {
  GENERAL = "GENERAL",
  DIRECCION = "DIRECCION",
  ADMIN = "ADMIN",
}

export enum ParkingLocation {
  SUBTERRANEO = "SUBTERRANEO",
  EXTERIOR = "EXTERIOR",
}

export enum ReservationStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
}

// User Types
export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedParkingSpot?: string;
  createdAt: Date;
}

export interface SafeUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedParkingSpot?: ParkingSpot;
}

// Parking Spot Types
export interface ParkingSpot {
  _id: string;
  number: number;
  location: ParkingLocation;
  assignedTo?: string;
  assignedToName?: string;
}

// Availability Types
export interface Availability {
  _id: string;
  parkingSpotId: string;
  date: Date;
  isAvailable: boolean;
  markedBy: string;
}

// Reservation Types
export interface Reservation {
  _id: string;
  parkingSpotId: string;
  userId: string;
  date: Date;
  status: ReservationStatus;
  createdAt: Date;
}

export interface ReservationWithDetails extends Reservation {
  parkingSpot?: ParkingSpot;
  user?: SafeUser;
}
