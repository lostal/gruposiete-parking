"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  assignSpotAction,
  unassignSpotAction,
} from "@/app/actions/admin.actions";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface DashboardAdminProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialUsers: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialParkingSpots: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialReservations: any[];
}

export default function DashboardAdmin({
  initialUsers,
  initialParkingSpots,
  initialReservations,
}: DashboardAdminProps) {
  const router = useRouter();
  // We use props directly to respect server revalidations.
  // Exception: optimizations if needed, but for Admin, direct props are safer and cleaner.
  const users = initialUsers;
  const parkingSpots = initialParkingSpots;
  const reservations = initialReservations;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"direccion" | "general">(
    "direccion",
  );
  const { toast } = useToast();

  const handleAssignSpot = (userId: string, spotId: string) => {
    startTransition(async () => {
      try {
        const result = await assignSpotAction(userId, spotId);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "Plaza asignada",
          description: "La plaza ha sido asignada correctamente",
        });

        toast({
          title: "Plaza asignada",
          description: "La plaza ha sido asignada correctamente",
        });

        router.refresh();
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    });
  };

  const handleUnassignSpot = (userId: string) => {
    startTransition(async () => {
      try {
        const result = await unassignSpotAction(userId);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "Plaza desasignada",
          description: "La plaza ha sido liberada correctamente",
        });

        router.refresh();
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    });
  };

  const direccionUsers = users.filter((u) => u.role === "DIRECCION");
  const generalUsers = users.filter((u) => u.role === "GENERAL");
  const unassignedSpots = parkingSpots.filter((s) => !s.assignedTo);

  return (
    <div className="space-y-8">
      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-linear-to-br from-white to-blue-50 rounded-2xl p-6 brutal-border brutal-shadow hover:shadow-[8px_8px_0_0_#fdc373] transition-all duration-300">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Total Usuarios
          </p>
          <p className="text-4xl font-extrabold text-primary-900">
            {users.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {direccionUsers.length} Dirección, {generalUsers.length} General
          </p>
        </div>

        <div className="bg-linear-to-br from-white to-[#fdc373]/10 rounded-2xl p-6 brutal-border brutal-shadow hover:shadow-[8px_8px_0_0_#fdc373] transition-all duration-300">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Plazas Totales
          </p>
          <p className="text-4xl font-extrabold text-primary-900">
            {parkingSpots.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            <span className="inline-block px-2 py-0.5 rounded bg-[#fdc373] text-primary-900 font-bold text-xs mr-1">
              {unassignedSpots.length}
            </span>
            sin asignar
          </p>
        </div>

        <div className="bg-linear-to-br from-white to-green-50 rounded-2xl p-6 brutal-border brutal-shadow hover:shadow-[8px_8px_0_0_#fdc373] transition-all duration-300">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Reservas Activas
          </p>
          <p className="text-4xl font-extrabold text-primary-900">
            {reservations.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Próximas reservas</p>
        </div>
      </div>

      {/* Gestión de Usuarios */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-primary-900 mb-6">
          Gestión de Usuarios
        </h2>

        {/* Pestañas */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("direccion")}
            className={`px-6 py-3 rounded-lg font-bold text-sm brutal-border transition-all duration-200 ${
              activeTab === "direccion"
                ? "bg-[#fdc373] text-primary-900 shadow-[4px_4px_0_0_#343f48]"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Usuarios Dirección
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-6 py-3 rounded-lg font-bold text-sm brutal-border transition-all duration-200 ${
              activeTab === "general"
                ? "bg-[#fdc373] text-primary-900 shadow-[4px_4px_0_0_#343f48]"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Usuarios General
          </button>
        </div>

        {/* Contenido de Usuarios Dirección */}
        {activeTab === "direccion" && (
          <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
            {direccionUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 font-medium">
                  No hay usuarios de dirección registrados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-primary-900">
                      <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                        Usuario
                      </th>
                      <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                        Email
                      </th>
                      <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                        Plaza Asignada
                      </th>
                      <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {direccionUsers.map((user) => (
                      <tr key={user._id} className="border-b border-gray-200">
                        <td className="py-4 px-4 font-bold text-primary-900">
                          {user.name}
                        </td>
                        <td className="py-4 px-4 text-gray-500 font-medium">
                          {user.email}
                        </td>
                        <td className="py-4 px-4">
                          {user.assignedParkingSpot ? (
                            <span className="inline-block px-3 py-1 rounded-lg bg-[#fdc373] text-primary-900 font-bold text-sm border-2 border-primary-900">
                              Plaza {user.assignedParkingSpot.number}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-lg bg-gray-100 text-gray-500 font-bold text-sm border-2 border-gray-300">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2 flex-wrap">
                            <select
                              onChange={(e) =>
                                handleAssignSpot(user._id, e.target.value)
                              }
                              disabled={isPending}
                              className="px-4 py-2 rounded-lg bg-white text-primary-900 font-bold text-sm
                                       brutal-border disabled:opacity-50 disabled:cursor-not-allowed"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Asignar plaza
                              </option>
                              {parkingSpots.map((spot) => (
                                <option key={spot._id} value={spot._id}>
                                  Plaza {spot.number} -{" "}
                                  {spot.location === "SUBTERRANEO"
                                    ? "Subterráneo"
                                    : "Exterior"}
                                  {spot.assignedTo && " (Asignada)"}
                                </option>
                              ))}
                            </select>
                            {user.assignedParkingSpot && (
                              <button
                                onClick={() => handleUnassignSpot(user._id)}
                                disabled={isPending}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold text-sm
                                         brutal-border hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed
                                         transition-colors"
                                title="Quitar plaza"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contenido de Usuarios General */}
        {activeTab === "general" && (
          <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
            {generalUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 font-medium">
                  No hay usuarios generales registrados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-primary-900">
                      <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                        Usuario
                      </th>
                      <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {generalUsers.map((user) => (
                      <tr key={user._id} className="border-b border-gray-200">
                        <td className="py-4 px-4 font-bold text-primary-900">
                          {user.name}
                        </td>
                        <td className="py-4 px-4 text-gray-500 font-medium">
                          {user.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reservas Recientes */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-primary-900 mb-6">
          Reservas Recientes
        </h2>

        <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium">
                No hay reservas registradas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-primary-900">
                    <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                      Usuario
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                      Plaza
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                      Fecha
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-primary-900 uppercase text-xs tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.slice(0, 10).map((reservation) => (
                    <tr
                      key={reservation._id}
                      className="border-b border-gray-200"
                    >
                      <td className="py-4 px-4 font-bold text-primary-900">
                        {reservation.user?.name}
                      </td>
                      <td className="py-4 px-4 text-gray-500 font-medium">
                        Plaza {reservation.parkingSpot?.number}
                      </td>
                      <td className="py-4 px-4 text-gray-500 font-medium">
                        {new Date(reservation.date).toLocaleDateString("es-ES")}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-lg bg-green-100 text-green-700 font-bold text-sm uppercase">
                          {reservation.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
