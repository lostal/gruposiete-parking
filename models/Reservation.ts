import mongoose, { Document, Model, Schema } from "mongoose";
import { ReservationStatus } from "@/types";

export interface IReservation extends Document {
  parkingSpotId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    parkingSpotId: {
      type: Schema.Types.ObjectId,
      ref: "ParkingSpot",
      required: [true, "El ID de la plaza es requerido"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del usuario es requerido"],
    },
    date: {
      type: Date,
      required: [true, "La fecha es requerida"],
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.ACTIVE,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Índices para búsquedas eficientes
ReservationSchema.index({ parkingSpotId: 1, date: 1 });
ReservationSchema.index({ userId: 1, date: 1 });
ReservationSchema.index({ date: 1 });
ReservationSchema.index({ status: 1 });

// Índice compuesto único: solo una reserva activa por plaza por día
ReservationSchema.index(
  { parkingSpotId: 1, date: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ReservationStatus.ACTIVE },
  },
);

const Reservation: Model<IReservation> =
  mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);

export default Reservation;
