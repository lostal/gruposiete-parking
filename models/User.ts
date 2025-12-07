import mongoose, { Document, Model, Schema } from "mongoose";
import { UserRole } from "@/types";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedParkingSpot?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: [8, "La contraseña debe tener al menos 8 caracteres"],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.GENERAL,
      required: true,
    },
    assignedParkingSpot: {
      type: Schema.Types.ObjectId,
      ref: "ParkingSpot",
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Índices para mejorar el rendimiento
UserSchema.index({ role: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
