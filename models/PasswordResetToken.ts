import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del usuario es requerido"],
    },
    token: {
      type: String,
      required: [true, "El token es requerido"],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "La fecha de expiración es requerida"],
    },
    used: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para auto-eliminar tokens expirados (TTL index)
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Índice compuesto para búsquedas eficientes
PasswordResetTokenSchema.index({ token: 1, used: 1 });

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>(
    "PasswordResetToken",
    PasswordResetTokenSchema
  );

export default PasswordResetToken;
