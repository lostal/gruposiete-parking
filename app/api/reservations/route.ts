export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import Reservation from "@/models/Reservation";
import ParkingSpot from "@/models/ParkingSpot";
import User from "@/models/User";
import Availability from "@/models/Availability";
import { startOfDay, endOfDay } from "date-fns";
import { ReservationStatus, UserRole } from "@/types";
import mongoose from "mongoose";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  CreateReservationSchema,
  formatZodErrors,
} from "@/lib/schemas/reservation.schema";

// Asegurar que los modelos estén registrados para populate
const _ensureModels = [ParkingSpot, User];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const parkingSpotId = searchParams.get("parkingSpotId");
    const upcoming = searchParams.get("upcoming") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    await dbConnect();

    const query: any = { status: ReservationStatus.ACTIVE };

    // SEGURIDAD: Solo ADMIN puede ver reservas de otros usuarios
    if (userId) {
      // Si el userId solicitado no es el del usuario actual, verificar que sea ADMIN
      if (userId !== session.user.id && session.user.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: "No autorizado para ver reservas de otros usuarios" },
          { status: 403 },
        );
      }
      query.userId = userId;
    }

    if (parkingSpotId) {
      query.parkingSpotId = parkingSpotId;
    }

    // Filtrado por fechas
    if (upcoming) {
      query.date = { $gte: startOfDay(new Date()) };
    } else if (startDate || endDate) {
      // Rango personalizado
      query.date = {};
      if (startDate) {
        query.date.$gte = startOfDay(new Date(startDate));
      }
      if (endDate) {
        query.date.$lte = endOfDay(new Date(endDate));
      }
    } else {
      // PERFORMANCE: Si no se especifica filtro de fecha, limitar a últimos 90 días por defecto
      // Solo aplicar este límite si el usuario NO es ADMIN o si no hay otros filtros específicos
      if (session.user.role !== UserRole.ADMIN || (!userId && !parkingSpotId)) {
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 90);
        query.date = { $gte: startOfDay(defaultStartDate) };
      }
    }

    // Paginación
    const skip = (page - 1) * limit;
    const total = await Reservation.countDocuments(query);

    const reservations = await Reservation.find(query)
      .populate("parkingSpotId")
      .populate("userId", "name email")
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    const formattedReservations = reservations.map((res) => ({
      _id: res._id,
      date: res.date,
      status: res.status,
      createdAt: res.createdAt,
      parkingSpot: res.parkingSpotId,
      user: res.userId,
    }));

    return NextResponse.json({
      reservations: formattedReservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching reservations", error as Error);
    return NextResponse.json(
      { error: "Error al obtener reservas" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo usuarios generales pueden reservar
    if (session.user.role !== UserRole.GENERAL) {
      return NextResponse.json(
        { error: "Solo usuarios generales pueden reservar plazas" },
        { status: 403 },
      );
    }

    // RATE LIMITING: Máximo 10 intentos de reserva por usuario cada 5 minutos
    const rateLimit = checkRateLimit({
      identifier: `reservation:${session.user.id}`,
      limit: 10,
      windowSeconds: 5 * 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error:
            "Demasiados intentos de reserva. Intenta de nuevo en unos minutos.",
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
          },
        },
      );
    }

    // ZOD VALIDATION: Validate request body before any database operations
    const body = await request.json();
    const validation = CreateReservationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(formatZodErrors(validation.error), {
        status: 400,
      });
    }

    const { parkingSpotId, date: dateStr } = validation.data;
    const date = startOfDay(new Date(dateStr));

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json(
        { error: "Solo se pueden hacer reservas para días laborables (L-V)" },
        { status: 400 },
      );
    }

    if (date < startOfDay(new Date())) {
      return NextResponse.json(
        { error: "No se pueden hacer reservas para fechas pasadas" },
        { status: 400 },
      );
    }

    const maxFutureDate = startOfDay(new Date());
    maxFutureDate.setDate(maxFutureDate.getDate() + 60);
    if (date > maxFutureDate) {
      return NextResponse.json(
        {
          error: "No se pueden hacer reservas con más de 60 días de antelación",
        },
        { status: 400 },
      );
    }

    await dbConnect();

    // USAR TRANSACCIÓN para evitar race conditions
    // Implementar retry con backoff exponencial (máximo 3 intentos)
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      const session_db = await mongoose.startSession();
      session_db.startTransaction();

      try {
        const existingUserReservation = await Reservation.findOne({
          userId: session.user.id,
          date: { $gte: date, $lt: endOfDay(date) },
          status: ReservationStatus.ACTIVE,
        }).session(session_db);

        if (existingUserReservation) {
          await session_db.abortTransaction();
          return NextResponse.json(
            { error: "Ya tienes una reserva activa para este día" },
            { status: 400 },
          );
        }

        const availability = await Availability.findOne({
          parkingSpotId,
          date: { $gte: date, $lt: endOfDay(date) },
          isAvailable: false,
        }).session(session_db);

        if (!availability) {
          await session_db.abortTransaction();
          return NextResponse.json(
            {
              error:
                "Esta plaza no está disponible para reservar en esta fecha",
            },
            { status: 400 },
          );
        }

        const existingReservation = await Reservation.findOne({
          parkingSpotId,
          date: { $gte: date, $lt: endOfDay(date) },
          status: ReservationStatus.ACTIVE,
        }).session(session_db);

        if (existingReservation) {
          await session_db.abortTransaction();
          return NextResponse.json(
            { error: "Esta plaza ya ha sido reservada por otro usuario" },
            { status: 400 },
          );
        }

        const reservationData = {
          parkingSpotId,
          userId: session.user.id,
          date,
          status: ReservationStatus.ACTIVE,
        };

        const [reservation] = await Reservation.create([reservationData], {
          session: session_db,
        });

        await session_db.commitTransaction();

        const populatedReservation = await Reservation.findById(reservation._id)
          .populate("parkingSpotId")
          .populate("userId", "name email");

        if (!populatedReservation) {
          return NextResponse.json(
            { error: "Error al obtener reserva creada" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          reservation: {
            _id: populatedReservation._id,
            date: populatedReservation.date,
            parkingSpot: populatedReservation.parkingSpotId,
            user: populatedReservation.userId,
          },
        });
      } catch (transactionError) {
        await session_db.abortTransaction();

        if (transactionError instanceof Error) {
          // Error de clave duplicada (race condition) - reintentar
          if (
            transactionError.message.includes("duplicate key") ||
            transactionError.message.includes("E11000")
          ) {
            lastError = transactionError;
            retries--;

            if (retries > 0) {
              // Espera con backoff exponencial: 50ms, 100ms, 200ms
              const delay = 50 * Math.pow(2, 3 - retries);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            // Si agotamos reintentos, salir del loop y devolver error
            break;
          }

          // Error de validación de Mongoose - retornar 400
          if (transactionError.name === "ValidationError") {
            session_db.endSession();
            logger.error(
              "Validation error in reservation transaction",
              transactionError,
            );
            return NextResponse.json(
              {
                error:
                  "Datos de reserva inválidos: " + transactionError.message,
              },
              { status: 400 },
            );
          }

          // Error de cast (ID inválido) - retornar 400
          if (transactionError.name === "CastError") {
            session_db.endSession();
            logger.error(
              "Cast error in reservation transaction",
              transactionError,
            );
            return NextResponse.json(
              { error: "ID de plaza inválido" },
              { status: 400 },
            );
          }

          // Errores de MongoDB transaccionales (WriteConflict, etc.) - reintentar una vez
          if (
            transactionError.message.includes("WriteConflict") ||
            transactionError.message.includes("TransientTransactionError")
          ) {
            lastError = transactionError;
            retries--;

            if (retries > 0) {
              const delay = 100;
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            break;
          }

          // Error de conexión a BD - retornar 503
          if (
            transactionError.message.includes("MongoNetworkError") ||
            transactionError.message.includes("connection") ||
            transactionError.message.includes("timeout")
          ) {
            session_db.endSession();
            logger.error(
              "Database connection error in reservation",
              transactionError,
            );
            return NextResponse.json(
              {
                error:
                  "Error de conexión con la base de datos. Intenta de nuevo.",
              },
              { status: 503 },
            );
          }

          // Otros errores no reintentar
          session_db.endSession();
          logger.error(
            "Unexpected error in reservation transaction",
            transactionError,
          );
          throw transactionError;
        }

        // Error no es instancia de Error - lanzar
        session_db.endSession();
        throw transactionError;
      } finally {
        // Asegurar que la sesión se cierra solo si no se ha cerrado ya
        if (session_db.inTransaction()) {
          await session_db.abortTransaction();
        }
        session_db.endSession();
      }
    }

    // Si llegamos aquí, todos los reintentos fallaron
    if (lastError) {
      return NextResponse.json(
        { error: "Esta plaza ya ha sido reservada por otro usuario" },
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error("Error creating reservation", error as Error);
    return NextResponse.json(
      { error: "Error al crear reserva" },
      { status: 500 },
    );
  }
}
