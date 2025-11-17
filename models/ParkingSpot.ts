import mongoose, { Document, Model, Schema } from "mongoose";
import { ParkingLocation } from "@/types";

export interface IParkingSpot extends Document {
  number: number;
  location: ParkingLocation;
  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;
}

const ParkingSpotSchema = new Schema<IParkingSpot>(
  {
    number: {
      type: Number,
      required: [true, "El número de plaza es requerido"],
      unique: true,
    },
    location: {
      type: String,
      enum: Object.values(ParkingLocation),
      required: [true, "La ubicación es requerida"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    assignedToName: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
ParkingSpotSchema.index({ location: 1 });
ParkingSpotSchema.index({ assignedTo: 1 });

const ParkingSpot: Model<IParkingSpot> =
  mongoose.models.ParkingSpot ||
  mongoose.model<IParkingSpot>("ParkingSpot", ParkingSpotSchema);

export default ParkingSpot;
