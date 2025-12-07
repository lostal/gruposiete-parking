"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { UserRole } from "@/types";
import {
  AUTH_CONSTANTS,
  VALIDATION_CONSTANTS,
  isValidCorporateEmail,
} from "@/lib/constants";
import {
  sanitizeName,
  sanitizeEmail,
  containsMaliciousContent,
} from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { sendEmail, getPasswordResetEmail } from "@/lib/email/resend";
import { headers } from "next/headers";
import { checkRateLimitRedis } from "@/lib/ratelimit-redis";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
};
const registerSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(VALIDATION_CONSTANTS.MAX_NAME_LENGTH, "El nombre es demasiado largo"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    ),
  role: z.nativeEnum(UserRole).optional(),
});

export async function registerAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawData = Object.fromEntries(formData.entries());
  const nameRaw = rawData.name as string;
  const emailRaw = rawData.email as string;
  const password = rawData.password as string;
  const roleRaw = rawData.role as UserRole;

  // Rate Limit Check
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const limit = await checkRateLimitRedis(`register_${ip}`, "registro");

  if (!limit.success) {
    return { error: "Demasiados intentos. Inténtalo más tarde." };
  }

  // Sanitize
  const finalName = sanitizeName(nameRaw || "");
  const finalEmail = sanitizeEmail(emailRaw || "");

  if (containsMaliciousContent(finalName)) {
    return { error: "El nombre contiene caracteres no permitidos" };
  }

  // Validate
  const validatedData = registerSchema.safeParse({
    name: finalName,
    email: finalEmail,
    password,
    role: roleRaw,
  });

  if (!validatedData.success) {
    return { error: validatedData.error.issues[0].message };
  }

  if (!isValidCorporateEmail(finalEmail)) {
    return { error: "Solo se permiten emails corporativos (@gruposiete.es)" };
  }

  try {
    await dbConnect();
    const existingUser = await User.findOne({ email: finalEmail });

    if (existingUser) {
      // Artificial delay similar to API to prevent enumeration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { error: "No se pudo completar el registro. Verifica los datos." };
    }

    const hashedPassword = await bcrypt.hash(
      validatedData.data.password,
      AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS,
    );

    const user = await User.create({
      name: validatedData.data.name,
      email: validatedData.data.email,
      password: hashedPassword,
      role: validatedData.data.role || UserRole.GENERAL,
    });

    const { password: _p, ...userWithoutPassword } = user.toObject();

    return {
      success: true,
      message: "Usuario creado correctamente",
      user: userWithoutPassword,
    };
  } catch (error) {
    logger.error("Error en registro (Action)", error as Error);
    return { error: "Error al crear usuario" };
  }
}

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

export async function forgotPasswordAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const emailRaw = formData.get("email") as string;

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const limit = await checkRateLimitRedis(`forgot_${ip}`, "registro"); // Usamos pool de registro

  if (!limit.success) {
    return { error: "Demasiados intentos. Inténtalo más tarde." };
  }

  const sanitizedEmail = sanitizeEmail(emailRaw || "");

  const validated = forgotSchema.safeParse({ email: sanitizedEmail });
  if (!validated.success) return { error: validated.error.issues[0].message };

  const successMessage =
    "Si existe una cuenta con ese email, recibirás un enlace.";

  try {
    await dbConnect();
    const user = await User.findOne({ email: validated.data.email });

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { message: successMessage, success: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.updateMany(
      { userId: user._id, used: false, expiresAt: { $gt: new Date() } },
      { used: true },
    );

    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Restablecer contraseña - Gruposiete Parking",
      html: getPasswordResetEmail(user.name, resetUrl),
    });

    return { success: true, message: successMessage };
  } catch (error) {
    logger.error("Error en forgotPasswordAction", error as Error);
    return { error: "Error al procesar la solicitud" };
  }
}

const resetSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `La contraseña debe tener al menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    ),
});

export async function resetPasswordAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const limit = await checkRateLimitRedis(`reset_${ip}`, "registro");

  if (!limit.success) {
    return { error: "Demasiados intentos. Inténtalo más tarde." };
  }

  const validated = resetSchema.safeParse({ token, password });
  if (!validated.success) return { error: validated.error.issues[0].message };

  try {
    await dbConnect();
    const resetToken = await PasswordResetToken.findOne({
      token: validated.data.token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return { error: "El enlace es inválido o ha expirado" };
    }

    const user = await User.findById(resetToken.userId);
    if (!user) return { error: "Usuario no encontrado" };

    const hashedPassword = await bcrypt.hash(
      validated.data.password,
      AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS,
    );

    user.password = hashedPassword;
    await user.save();

    resetToken.used = true;
    await resetToken.save();

    return { success: true, message: "Contraseña restablecida correctamente." };
  } catch (error) {
    logger.error("Error en resetPasswordAction", error as Error);
    return { error: "Error al restablecer la contraseña" };
  }
}
