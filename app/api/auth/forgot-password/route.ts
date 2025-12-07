import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { sendEmail, getPasswordResetEmail } from "@/lib/email/resend";
import { sanitizeEmail } from "@/lib/sanitize";
import {
  checkRateLimitRedis,
  getClientIdentifier,
} from "@/lib/ratelimit-redis";
import { logger, getRequestContext } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export async function POST(request: Request) {
  try {
    // RATE LIMITING: Máximo 3 intentos cada 15 minutos por IP
    const identifier = getClientIdentifier(request);
    const rateLimit = await checkRateLimitRedis(
      `forgot-password:${identifier}`,
      "registro",
    );

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
      logger.warn("Rate limit excedido en forgot-password", {
        identifier,
        ...getRequestContext(request),
      });

      return NextResponse.json(
        {
          error: "Demasiados intentos. Intenta de nuevo más tarde.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        },
      );
    }

    const body = await request.json();
    const sanitizedEmail = sanitizeEmail(body.email || "");
    const validatedData = forgotPasswordSchema.parse({ email: sanitizedEmail });

    await dbConnect();

    const user = await User.findOne({ email: validatedData.email });

    // SEGURIDAD: No revelar si el email existe o no
    // Siempre responder con el mismo mensaje
    const successMessage =
      "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.";

    if (!user) {
      logger.info("Intento de reset para email no registrado", {
        email: validatedData.email,
        ...getRequestContext(request),
      });

      // Delay artificial para prevenir timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return NextResponse.json({
        message: successMessage,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetToken.updateMany(
      {
        userId: user._id,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        used: true,
      },
    );

    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    Promise.resolve()
      .then(async () => {
        try {
          await sendEmail({
            to: user.email,
            subject: "Restablecer contraseña - Gruposiete Parking",
            html: getPasswordResetEmail(user.name, resetUrl),
          });

          logger.info("Email de reset enviado", {
            userId: user._id.toString(),
            email: user.email,
          });
        } catch (emailError) {
          logger.error("Error al enviar email de reset", emailError as Error, {
            userId: user._id.toString(),
            email: user.email,
          });
        }
      })
      .catch((error) => {
        console.error("Error in background email task:", error);
      });

    return NextResponse.json({
      message: successMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }

    logger.error(
      "Error en forgot-password",
      error as Error,
      getRequestContext(request),
    );
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 },
    );
  }
}
