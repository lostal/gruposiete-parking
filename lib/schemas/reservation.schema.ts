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
    .string({
      required_error: "El ID de la plaza es obligatorio",
      invalid_type_error: "El ID de la plaza debe ser un texto",
    })
    .min(1, "El ID de la plaza no puede estar vacío")
    .regex(objectIdRegex, "El ID de la plaza tiene un formato inválido"),

  date: z
    .string({
      required_error: "La fecha es obligatoria",
      invalid_type_error: "La fecha debe ser un texto en formato ISO",
    })
    .min(1, "La fecha no puede estar vacía")
    .refine(
      (val) => {
        const parsed = new Date(val);
        return !isNaN(parsed.getTime());
      },
      { message: "El formato de fecha es inválido" },
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
  const details = error.errors.map((err) => ({
    field: err.path.join(".") || "body",
    message: err.message,
  }));

  return {
    error: "Datos de reserva inválidos",
    details,
  };
}
