import { startOfDay, endOfDay } from "date-fns";
import mongoose, { ClientSession } from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import Reservation, { IReservation } from "@/models/Reservation";
import Availability from "@/models/Availability";
import ParkingSpot, { IParkingSpot } from "@/models/ParkingSpot";
import User from "@/models/User";
import { ReservationStatus } from "@/types";
import { logger } from "@/lib/logger";
import {
  sendEmail,
  getNewSpotsAvailableDistributionEmail,
} from "@/lib/email/resend";
import { formatDate } from "@/lib/utils/dates";
import { IReservationWithSpot } from "@/types/mongoose.types";

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
  status: ReservationStatus;
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
  // Buscar si el dueño ha marcado que NO usará la plaza (ownerIsUsing = false)
  const availability = await Availability.findOne({
    parkingSpotId: ctx.parkingSpotId,
    date: { $gte: ctx.date, $lt: endOfDay(ctx.date) },
    ownerIsUsing: false,
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
    status: populated.status,
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

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

export interface GetReservationsParams {
  userId?: string;
  parkingSpotId?: string;
  upcoming?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  isAdmin?: boolean;
  requestingUserId?: string;
}

export interface GetReservationsResult {
  reservations: PopulatedReservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getReservations(
  params: GetReservationsParams,
): Promise<GetReservationsResult> {
  await dbConnect();

  const {
    userId,
    parkingSpotId,
    upcoming,
    startDate,
    endDate,
    page = 1,
    limit = 50,
    isAdmin = false,
    requestingUserId,
  } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { status: ReservationStatus.ACTIVE };

  // SECURITY CHECKS
  if (userId) {
    if (userId !== requestingUserId && !isAdmin) {
      throw new ReservationError(
        "No autorizado para ver reservas de otros usuarios",
        ReservationErrorCode.DATABASE_ERROR, // Reusing generic error code or creating new one
        403,
      );
    }
    query.userId = userId;
  }

  if (parkingSpotId) {
    query.parkingSpotId = parkingSpotId;
  }

  // Date filtering
  if (upcoming) {
    query.date = { $gte: startOfDay(new Date()) };
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = startOfDay(startDate);
    }
    if (endDate) {
      query.date.$lte = endOfDay(endDate);
    }
  } else {
    // Default limit: last 90 days if not admin and no specific filter
    if (!isAdmin || (!userId && !parkingSpotId)) {
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 90);
      query.date = { $gte: startOfDay(defaultStartDate) };
    }
  }

  const skip = (page - 1) * limit;
  const total = await Reservation.countDocuments(query);

  const reservations = await Reservation.find(query)
    .populate("parkingSpotId")
    .populate("userId", "name email")
    .sort({ date: 1 })
    .skip(skip)
    .limit(limit);

  const formattedReservations = reservations.map((res) => ({
    _id: res._id.toString(),
    date: res.date,
    status: res.status,
    parkingSpot: res.parkingSpotId as unknown as IParkingSpot,
    user: res.userId as unknown as {
      _id: string;
      name: string;
      email: string;
    },
  }));

  return {
    reservations: formattedReservations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserHistory(
  userId: string,
  all: boolean = false,
): Promise<PopulatedReservation[]> {
  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { userId };

  if (!all) {
    // Only upcoming and ACTIVE
    query.date = { $gte: startOfDay(new Date()) };
    query.status = ReservationStatus.ACTIVE;
  }

  const sort = all ? { date: -1 as const } : { date: 1 as const };

  const reservations = await Reservation.find(query)
    .populate("parkingSpotId")
    .sort(sort);

  return reservations.map((res) => ({
    _id: res._id.toString(),
    date: res.date,
    status: res.status,
    parkingSpot: res.parkingSpotId as unknown as IParkingSpot,
    user: { _id: userId, name: "", email: "" }, // Not needed for simple history usually, or populate if needed
  }));
}

// ============================================================================
// CANCELLATION
// ============================================================================

export async function cancelReservation(
  reservationId: string,
  requestingUserId: string,
  isAdmin: boolean,
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    throw new ReservationError(
      "ID de reserva inválido",
      ReservationErrorCode.DATABASE_ERROR,
    );
  }

  await dbConnect();

  const reservation = (await Reservation.findById(reservationId).populate(
    "parkingSpotId",
  )) as IReservationWithSpot | null;

  if (!reservation) {
    throw new ReservationError(
      "Reserva no encontrada",
      ReservationErrorCode.DATABASE_ERROR,
      404,
    );
  }

  // Authorization check
  if (reservation.userId.toString() !== requestingUserId && !isAdmin) {
    throw new ReservationError(
      "No autorizado",
      ReservationErrorCode.DATABASE_ERROR,
      403,
    );
  }

  // Store data for email
  const parkingSpot = reservation.parkingSpotId;
  const reservationDate = reservation.date;

  reservation.status = ReservationStatus.CANCELLED;
  await reservation.save();

  // Send distribution email
  Promise.resolve()
    .then(async () => {
      try {
        const distributionEmail = process.env.DISTRIBUTION_EMAIL;

        if (!distributionEmail) {
          logger.warn(
            "DISTRIBUTION_EMAIL no configurado. Email de notificación no enviado.",
          );
          return;
        }

        if (parkingSpot) {
          const spotInfo = `${parkingSpot.number} (${
            parkingSpot.location === "SUBTERRANEO" ? "Subterráneo" : "Exterior"
          })`;

          await sendEmail({
            to: distributionEmail,
            subject: "¡Nuevas plazas disponibles! - Gruposiete Parking",
            html: getNewSpotsAvailableDistributionEmail(
              formatDate(reservationDate),
              [spotInfo],
            ),
          });
        }
      } catch (emailError) {
        logger.error("Error sending cancellation emails", emailError as Error);
      }
    })
    .catch((error) => {
      logger.error("Error in background email task", error as Error);
    });
}
