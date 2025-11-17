export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import ParkingSpot from "@/models/ParkingSpot";
import { UserRole } from "@/types";
import { PAGINATION_CONSTANTS } from "@/lib/constants";

// Asegurar que el modelo ParkingSpot esté registrado para populate
const _ensureModels = [ParkingSpot];

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(
      searchParams.get("page") || String(PAGINATION_CONSTANTS.DEFAULT_PAGE)
    );
    const limit = Math.min(
      parseInt(
        searchParams.get("limit") || String(PAGINATION_CONSTANTS.DEFAULT_LIMIT)
      ),
      PAGINATION_CONSTANTS.MAX_LIMIT
    );
    const role = searchParams.get("role"); // Filtro opcional por rol

    await dbConnect();

    const query: any = {};
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .populate("assignedParkingSpot")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}
