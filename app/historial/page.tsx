import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserHistory } from "@/lib/services/reservations.service";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserRole } from "@/types";

export default async function HistorialPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== UserRole.GENERAL) {
    redirect("/dashboard");
  }

  // Fetch all history (past and future)
  const reservations = await getUserHistory(session.user.id, true);

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary-900">
          Historial de Reservas
        </h1>
        <p className="text-gray-500 mt-1 font-medium">
          Consulta todas tus reservas
        </p>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 brutal-border brutal-shadow text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-400 font-medium">
            No tienes reservas pasadas para mostrardas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => {
            const isPast = new Date(reservation.date) < new Date();
            const isCancelled = reservation.status === "CANCELLED";

            let statusText = "";
            let statusColor = "";

            if (isCancelled) {
              statusText = "Cancelada";
              statusColor = "bg-red-100 text-red-700";
            } else if (isPast) {
              statusText = "Pasada";
              statusColor = "bg-gray-100 text-gray-600";
            } else {
              statusText = "Próxima";
              statusColor = "bg-green-100 text-green-700";
            }

            return (
              <div
                key={reservation._id.toString()}
                className="bg-white rounded-xl p-4 brutal-border brutal-shadow"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-primary-900 flex items-center justify-center text-white font-mono-data font-bold text-sm">
                      <span className="text-sm font-mono-data font-bold text-white">
                        {reservation.parkingSpot.location === "SUBTERRANEO"
                          ? "S"
                          : "E"}
                        -{reservation.parkingSpot.number}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-primary-900">
                        Plaza {reservation.parkingSpot.number}
                      </p>
                      <p className="text-xs text-gray-500 font-bold uppercase">
                        {reservation.parkingSpot.location === "SUBTERRANEO"
                          ? "Subterráneo"
                          : "Exterior"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-gray-400 uppercase tracking-wide font-bold">
                        Fecha
                      </p>
                      <p className="font-bold text-primary-900">
                        {format(new Date(reservation.date), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-lg font-bold text-xs uppercase ${statusColor}`}
                      >
                        {statusText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
