import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAvailability extends Document {
  parkingSpotId: mongoose.Types.ObjectId;
  date: Date;
  /**
   * Indica si el dueño usará la plaza ese día.
   * - true: El dueño la usa → NO disponible para reservar por otros
   * - false: El dueño NO la usa → DISPONIBLE para reservar
   */
  ownerIsUsing: boolean;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>(
  {
    parkingSpotId: {
      type: Schema.Types.ObjectId,
      ref: "ParkingSpot",
      required: [true, "El ID de la plaza es requerido"],
    },
    date: {
      type: Date,
      required: [true, "La fecha es requerida"],
    },
    ownerIsUsing: {
      type: Boolean,
      default: true, // Por defecto TRUE = el dueño usa la plaza (NO disponible para reservar)
      required: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario que marca la disponibilidad es requerido"],
    },
  },
  {
    timestamps: true,
  },
);

// Índices compuestos para búsquedas eficientes
AvailabilitySchema.index({ parkingSpotId: 1, date: 1 }, { unique: true });
AvailabilitySchema.index({ date: 1 });
AvailabilitySchema.index({ ownerIsUsing: 1 });

const Availability: Model<IAvailability> =
  mongoose.models.Availability ||
  mongoose.model<IAvailability>("Availability", AvailabilitySchema);

export default Availability;
