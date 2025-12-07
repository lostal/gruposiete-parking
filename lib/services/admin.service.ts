import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import ParkingSpot from "@/models/ParkingSpot";
import { IParkingSpot } from "@/models/ParkingSpot";
import { UserRole } from "@/types";

export interface PopulatedUser {
  _id: string; // or mongoose.Types.ObjectId, but lean() + serialization might vary. Let's assume serialization happens later.
  // actually lean() keeps ObjectId, but page.tsx uses it.
  // Let's use any for ID to be safe or string if we map it.
  // Mongoose lean returns ObjectId objects.
  // Dashboard expects any[] generally but let's try to match.
  // I will use `any` for _id key to be safe or string.
  // Actually, let's just allow it to inferred or use `any` in implementation.
  // But wait, I see `PopulatedUser` is what I want to export.
  name: string;
  email: string;
  role: UserRole;
  assignedParkingSpot?: IParkingSpot;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAllUsers(): Promise<PopulatedUser[]> {
  await dbConnect();
  // Populate assignedParkingSpot to show info
  const users = await User.find({})
    .populate("assignedParkingSpot")
    .sort({ name: 1 })
    .lean();
  return users as unknown as PopulatedUser[];
}

export async function getAllParkingSpots() {
  await dbConnect();
  const spots = await ParkingSpot.find({}).sort({ number: 1 }).lean();
  return spots;
}

export async function assignSpotToUser(userId: string, spotId: string) {
  await dbConnect();
  const user = await User.findById(userId);
  const spot = await ParkingSpot.findById(spotId);

  if (!user || !spot) throw new Error("Usuario o plaza no encontrados");

  // Logic: Unassign current spots/users if any?
  // If user has a spot, unassign it?
  if (user.assignedParkingSpot) {
    await ParkingSpot.findByIdAndUpdate(user.assignedParkingSpot, {
      $unset: { assignedTo: 1, assignedToName: 1 },
    });
  }
  // If spot is assigned, remove user?
  if (spot.assignedTo) {
    await User.findByIdAndUpdate(spot.assignedTo, {
      $unset: { assignedParkingSpot: 1 },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (user as any).assignedParkingSpot = new mongoose.Types.ObjectId(spotId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spot as any).assignedTo = new mongoose.Types.ObjectId(userId);

  spot.assignedToName = user.name;

  await user.save();
  await spot.save();
}

export async function unassignSpotFromUser(userId: string) {
  await dbConnect();
  const user = await User.findById(userId);
  if (!user || !user.assignedParkingSpot)
    throw new Error("Usuario o asignación no encontrada");

  const spotId = user.assignedParkingSpot;

  await User.findByIdAndUpdate(userId, {
    $unset: { assignedParkingSpot: 1 },
  });
  await ParkingSpot.findByIdAndUpdate(spotId, {
    $unset: { assignedTo: 1, assignedToName: 1 },
  });
}
