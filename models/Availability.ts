import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAvailability extends Document {
  parkingSpotId: mongoose.Types.ObjectId;
  date: Date;
  isAvailable: boolean;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>(
  {
    parkingSpotId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingSpot',
      required: [true, 'El ID de la plaza es requerido'],
    },
    date: {
      type: Date,
      required: [true, 'La fecha es requerida'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      required: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario que marca la disponibilidad es requerido'],
    },
  },
  {
    timestamps: true,
  },
);

// Índices compuestos para búsquedas eficientes
AvailabilitySchema.index({ parkingSpotId: 1, date: 1 }, { unique: true });
AvailabilitySchema.index({ date: 1 });
AvailabilitySchema.index({ isAvailable: 1 });

const Availability: Model<IAvailability> =
  mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema);

export default Availability;
