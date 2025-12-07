export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import Reservation from "@/models/Reservation";
import ParkingSpot from "@/models/ParkingSpot";
import User from "@/models/User";
import { startOfDay, endOfDay } from "date-fns";
import { ReservationStatus, UserRole } from "@/types";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  CreateReservationSchema,
  formatZodErrors,
} from "@/lib/schemas/reservation.schema";
import {
  createReservation,
  ReservationError,
} from "@/lib/services/reservations.service";

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Mongoose query object
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

    // Delegate to service layer
    const result = await createReservation({
      userId: session.user.id,
      parkingSpotId: validation.data.parkingSpotId,
      date: startOfDay(new Date(validation.data.date)),
    });

    return NextResponse.json(result);
  } catch (error) {
    // Handle service-layer errors
    if (error instanceof ReservationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    logger.error("Error creating reservation", error as Error);
    return NextResponse.json(
      { error: "Error al crear reserva" },
      { status: 500 },
    );
  }
}
