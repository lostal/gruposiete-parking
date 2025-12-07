import { startOfDay, endOfDay } from "date-fns";
import mongoose, { ClientSession } from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import Reservation, { IReservation } from "@/models/Reservation";
import Availability from "@/models/Availability";
import ParkingSpot, { IParkingSpot } from "@/models/ParkingSpot";
import User from "@/models/User";
import { ReservationStatus } from "@/types";
import { logger } from "@/lib/logger";

// Ensure models are registered for populate
const _ensureModels = [ParkingSpot, User];

// ============================================================================
// TYPES
// ============================================================================

export interface CreateReservationParams {
  userId: string;
  parkingSpotId: string;
  date: Date;
}

export interface PopulatedReservation {
  _id: string;
  date: Date;
  parkingSpot: IParkingSpot;
  user: { _id: string; name: string; email: string };
}

export interface CreateReservationResult {
  success: true;
  reservation: PopulatedReservation;
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class ReservationError extends Error {
  constructor(
    message: string,
    public readonly code: ReservationErrorCode,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ReservationError";
  }
}

export enum ReservationErrorCode {
  WEEKEND_NOT_ALLOWED = "WEEKEND_NOT_ALLOWED",
  PAST_DATE = "PAST_DATE",
  TOO_FAR_IN_FUTURE = "TOO_FAR_IN_FUTURE",
  ALREADY_HAS_RESERVATION = "ALREADY_HAS_RESERVATION",
  SPOT_NOT_AVAILABLE = "SPOT_NOT_AVAILABLE",
  SPOT_ALREADY_RESERVED = "SPOT_ALREADY_RESERVED",
  CONCURRENT_CONFLICT = "CONCURRENT_CONFLICT",
  DATABASE_ERROR = "DATABASE_ERROR",
}

// ============================================================================
// BUSINESS RULE VALIDATORS (Pure functions)
// ============================================================================

/**
 * Validates that the date is a weekday (Monday to Friday)
 */
export function validateWeekday(date: Date): void {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    throw new ReservationError(
      "Solo se pueden hacer reservas para días laborables (L-V)",
      ReservationErrorCode.WEEKEND_NOT_ALLOWED,
    );
  }
}

/**
 * Validates that the date is not in the past
 */
export function validateNotPastDate(date: Date): void {
  if (date < startOfDay(new Date())) {
    throw new ReservationError(
      "No se pueden hacer reservas para fechas pasadas",
      ReservationErrorCode.PAST_DATE,
    );
  }
}

/**
 * Validates that the date is not too far in the future
 */
export function validateMaxFutureDate(date: Date, maxDays: number = 60): void {
  const maxFutureDate = startOfDay(new Date());
  maxFutureDate.setDate(maxFutureDate.getDate() + maxDays);

  if (date > maxFutureDate) {
    throw new ReservationError(
      `No se pueden hacer reservas con más de ${maxDays} días de antelación`,
      ReservationErrorCode.TOO_FAR_IN_FUTURE,
    );
  }
}

/**
 * Runs all business rule validations on the reservation date
 */
export function validateBusinessRules(date: Date): void {
  validateWeekday(date);
  validateNotPastDate(date);
  validateMaxFutureDate(date);
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

interface TransactionContext {
  session: ClientSession;
  userId: string;
  parkingSpotId: string;
  date: Date;
}

async function checkUserHasNoActiveReservation(
  ctx: TransactionContext,
): Promise<void> {
  const existing = await Reservation.findOne({
    userId: ctx.userId,
    date: { $gte: ctx.date, $lt: endOfDay(ctx.date) },
    status: ReservationStatus.ACTIVE,
  }).session(ctx.session);

  if (existing) {
    throw new ReservationError(
      "Ya tienes una reserva activa para este día",
      ReservationErrorCode.ALREADY_HAS_RESERVATION,
    );
  }
}

async function checkSpotIsMarkedAvailable(
  ctx: TransactionContext,
): Promise<void> {
  const availability = await Availability.findOne({
    parkingSpotId: ctx.parkingSpotId,
    date: { $gte: ctx.date, $lt: endOfDay(ctx.date) },
    isAvailable: false,
  }).session(ctx.session);

  if (!availability) {
    throw new ReservationError(
      "Esta plaza no está disponible para reservar en esta fecha",
      ReservationErrorCode.SPOT_NOT_AVAILABLE,
    );
  }
}

async function checkSpotNotAlreadyReserved(
  ctx: TransactionContext,
): Promise<void> {
  const existing = await Reservation.findOne({
    parkingSpotId: ctx.parkingSpotId,
    date: { $gte: ctx.date, $lt: endOfDay(ctx.date) },
    status: ReservationStatus.ACTIVE,
  }).session(ctx.session);

  if (existing) {
    throw new ReservationError(
      "Esta plaza ya ha sido reservada por otro usuario",
      ReservationErrorCode.SPOT_ALREADY_RESERVED,
    );
  }
}

async function insertReservation(
  ctx: TransactionContext,
): Promise<IReservation> {
  const [reservation] = await Reservation.create(
    [
      {
        parkingSpotId: ctx.parkingSpotId,
        userId: ctx.userId,
        date: ctx.date,
        status: ReservationStatus.ACTIVE,
      },
    ],
    { session: ctx.session },
  );
  return reservation;
}

async function populateReservation(
  reservationId: string,
): Promise<PopulatedReservation> {
  const populated = await Reservation.findById(reservationId)
    .populate("parkingSpotId")
    .populate("userId", "name email");

  if (!populated) {
    throw new ReservationError(
      "Error al obtener reserva creada",
      ReservationErrorCode.DATABASE_ERROR,
      500,
    );
  }

  return {
    _id: populated._id.toString(),
    date: populated.date,
    parkingSpot: populated.parkingSpotId as unknown as IParkingSpot,
    user: populated.userId as unknown as {
      _id: string;
      name: string;
      email: string;
    },
  };
}

// ============================================================================
// MAIN SERVICE FUNCTION
// ============================================================================

const MAX_RETRIES = 3;

/**
 * Creates a new reservation with full transaction support and retry logic
 * for handling race conditions.
 *
 * This function is decoupled from HTTP and can be called from:
 * - API routes
 * - CLI scripts
 * - Cron jobs
 * - Tests
 */
export async function createReservation(
  params: CreateReservationParams,
): Promise<CreateReservationResult> {
  const { userId, parkingSpotId, date } = params;

  // Validate business rules before any DB operations
  validateBusinessRules(date);

  await dbConnect();

  let retries = MAX_RETRIES;
  let lastError: Error | null = null;

  while (retries > 0) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const ctx: TransactionContext = { session, userId, parkingSpotId, date };

      await checkUserHasNoActiveReservation(ctx);
      await checkSpotIsMarkedAvailable(ctx);
      await checkSpotNotAlreadyReserved(ctx);

      const reservation = await insertReservation(ctx);
      await session.commitTransaction();

      const populated = await populateReservation(reservation._id.toString());

      return { success: true, reservation: populated };
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof ReservationError) {
        throw error;
      }

      if (error instanceof Error) {
        // Duplicate key error (race condition) - retry
        if (
          error.message.includes("duplicate key") ||
          error.message.includes("E11000")
        ) {
          lastError = error;
          retries--;

          if (retries > 0) {
            const delay = 50 * Math.pow(2, MAX_RETRIES - retries);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          break;
        }

        // MongoDB transactional errors - retry
        if (
          error.message.includes("WriteConflict") ||
          error.message.includes("TransientTransactionError")
        ) {
          lastError = error;
          retries--;

          if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
          }
          break;
        }

        // Mongoose validation error
        if (error.name === "ValidationError") {
          logger.error("Validation error in reservation transaction", error);
          throw new ReservationError(
            "Datos de reserva inválidos: " + error.message,
            ReservationErrorCode.DATABASE_ERROR,
          );
        }

        // Cast error (invalid ID)
        if (error.name === "CastError") {
          logger.error("Cast error in reservation transaction", error);
          throw new ReservationError(
            "ID de plaza inválido",
            ReservationErrorCode.DATABASE_ERROR,
          );
        }

        // Connection error
        if (
          error.message.includes("MongoNetworkError") ||
          error.message.includes("connection") ||
          error.message.includes("timeout")
        ) {
          logger.error("Database connection error in reservation", error);
          throw new ReservationError(
            "Error de conexión con la base de datos. Intenta de nuevo.",
            ReservationErrorCode.DATABASE_ERROR,
            503,
          );
        }

        // Unknown error
        logger.error("Unexpected error in reservation transaction", error);
        throw error;
      }

      throw error;
    } finally {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
    }
  }

  // All retries exhausted
  if (lastError) {
    throw new ReservationError(
      "Esta plaza ya ha sido reservada por otro usuario",
      ReservationErrorCode.CONCURRENT_CONFLICT,
    );
  }

  throw new ReservationError(
    "Error inesperado al crear reserva",
    ReservationErrorCode.DATABASE_ERROR,
    500,
  );
}
