import { z } from "zod";

/**
 * MongoDB ObjectId validation regex
 * 24 hexadecimal characters
 */
const objectIdRegex = /^[a-fA-F0-9]{24}$/;

/**
 * Schema for creating a new reservation
 * Validates parkingSpotId and date before any database operations
 */
export const CreateReservationSchema = z.object({
  parkingSpotId: z
    .string({ error: "El ID de la plaza es obligatorio y debe ser un texto" })
    .min(1, { error: "El ID de la plaza no puede estar vacío" })
    .regex(objectIdRegex, {
      error: "El ID de la plaza tiene un formato inválido",
    }),

  date: z
    .string({ error: "La fecha es obligatoria y debe ser un texto" })
    .min(1, { error: "La fecha no puede estar vacía" })
    .refine(
      (val) => {
        const parsed = new Date(val);
        return !isNaN(parsed.getTime());
      },
      { error: "El formato de fecha es inválido" },
    ),
});

/**
 * Inferred TypeScript type from the schema
 */
export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

/**
 * Helper to format Zod errors into a user-friendly response
 */
export function formatZodErrors(error: z.ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  const details = error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

  return {
    error: "Datos de reserva inválidos",
    details,
  };
}
