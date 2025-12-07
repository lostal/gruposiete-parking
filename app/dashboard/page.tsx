export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/types";
import DashboardGeneral from "@/components/dashboard/dashboard-general";
import DashboardDireccion from "@/components/dashboard/dashboard-direccion";
import DashboardAdmin from "@/components/dashboard/dashboard-admin";
import {
  getUserHistory,
  getReservations,
  PopulatedReservation,
} from "@/lib/services/reservations.service";
import {
  getAvailableDays,
  getParkingSpotById,
} from "@/lib/services/parking.service";
import { getSpotAvailability } from "@/lib/services/availability.service";
import { startOfMonth, endOfMonth } from "date-fns";
import {
  getAllUsers,
  getAllParkingSpots,
  PopulatedUser,
} from "@/lib/services/admin.service";
import { IParkingSpot } from "@/models/ParkingSpot";
import { IAvailability } from "@/models/Availability";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { role } = session.user;
  const today = new Date();

  // SERIALIZATION HELPER
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialize = (data: any) => JSON.parse(JSON.stringify(data));

  // DATA FETCHING
  let initialMyReservations: PopulatedReservation[] = [];
  let initialDaysWithAvailability: string[] = [];
  let initialParkingSpot: IParkingSpot | null = null;
  let initialSpotAvailability: IAvailability[] = [];
  let initialSpotReservations: PopulatedReservation[] = [];
  let initialAdminUsers: PopulatedUser[] = [];
  let initialAdminSpots: IParkingSpot[] = [];
  let initialAdminReservations: PopulatedReservation[] = [];

  if (role === UserRole.GENERAL) {
    initialMyReservations = await getUserHistory(session.user.id);
    initialDaysWithAvailability = await getAvailableDays(
      startOfMonth(today),
      endOfMonth(today),
    );
  }

  if (role === UserRole.DIRECCION && session.user.assignedParkingSpot) {
    initialParkingSpot = await getParkingSpotById(
      session.user.assignedParkingSpot,
    );
    initialSpotAvailability = await getSpotAvailability(
      session.user.assignedParkingSpot,
    );
    const resResult = await getReservations({
      parkingSpotId: session.user.assignedParkingSpot,
      upcoming: true,
      isAdmin: true, // Allow viewing reservations for the spot
    });
    initialSpotReservations = resResult.reservations;
  }

  if (role === UserRole.ADMIN) {
    const [users, spots, reservationsResult] = await Promise.all([
      getAllUsers(),
      getAllParkingSpots(),
      getReservations({ limit: 10, isAdmin: true }),
    ]);

    initialAdminUsers = users;
    initialAdminSpots = spots;
    initialAdminReservations = reservationsResult.reservations;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tighter text-primary-900">
          Hola, {session.user.name.split(" ")[0]}
        </h1>
        <p className="text-gray-500 mt-2 font-medium text-lg">
          {role === UserRole.ADMIN && "Panel de administración del sistema"}
          {role === UserRole.DIRECCION &&
            "Gestiona la disponibilidad de tu plaza"}
          {role === UserRole.GENERAL && "Reserva una plaza disponible"}
        </p>
      </div>

      {role === UserRole.GENERAL && (
        <DashboardGeneral
          userId={session.user.id}
          initialMyReservations={serialize(initialMyReservations)}
          initialDaysWithAvailability={initialDaysWithAvailability}
        />
      )}
      {role === UserRole.DIRECCION && (
        <DashboardDireccion
          userId={session.user.id}
          parkingSpotId={session.user.assignedParkingSpot}
          initialParkingSpot={serialize(initialParkingSpot)}
          initialAvailability={serialize(initialSpotAvailability)}
          initialReservations={serialize(initialSpotReservations)}
        />
      )}
      {role === UserRole.ADMIN && (
        <DashboardAdmin
          initialUsers={serialize(initialAdminUsers)}
          initialParkingSpots={serialize(initialAdminSpots)}
          initialReservations={serialize(initialAdminReservations)}
        />
      )}
    </div>
  );
}
