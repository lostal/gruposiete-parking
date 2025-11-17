import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAvailability extends Document {
  parkingSpotId: mongoose.Types.ObjectId;
  date: Date;
  /**
   * IMPORTANTE: Semántica INVERSA por razones históricas
   * - isAvailable = false: Plaza DISPONIBLE para que otros usuarios la RESERVEN (el dueño NO la usará)
   * - isAvailable = true: Plaza NO disponible para reservar (el dueño SÍ la usará)
   *
   * TODO: Considerar renombrar a 'ownerWillUse' en una futura migración para mayor claridad
   */
  isAvailable: boolean;
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
    isAvailable: {
      type: Boolean,
      default: true, // Por defecto TRUE = plaza NO disponible para reservar (dueño la usa)
      required: true,
      // NOTA: Semántica inversa - false = disponible para reservar, true = NO disponible
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario que marca la disponibilidad es requerido"],
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para búsquedas eficientes
AvailabilitySchema.index({ parkingSpotId: 1, date: 1 }, { unique: true });
AvailabilitySchema.index({ date: 1 });
AvailabilitySchema.index({ isAvailable: 1 });

const Availability: Model<IAvailability> =
  mongoose.models.Availability ||
  mongoose.model<IAvailability>("Availability", AvailabilitySchema);

export default Availability;
