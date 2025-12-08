"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import {
  createReservationAction,
  cancelReservationAction,
} from "@/app/actions/reservation.actions";
import {
  getAvailableSpotsAction,
  getAvailableDaysAction,
} from "@/app/actions/parking.actions";
import { useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";

interface DashboardGeneralProps {
  userId: string;
  initialMyReservations: MyReservation[];
  initialDaysWithAvailability: string[];
}

interface AvailableSpot {
  _id: string;
  number: number;
  location: string;
  assignedToName: string;
}

interface MyReservation {
  _id: string;
  date: string;
  parkingSpot: {
    number: number;
    location: string;
  };
}

export default function DashboardGeneral({
  initialMyReservations,
  initialDaysWithAvailability,
}: DashboardGeneralProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSpots, setAvailableSpots] = useState<AvailableSpot[]>([]);

  // Use optimistic state for instant feedback
  const [optimisticReservations, setOptimisticReservations] = useOptimistic(
    initialMyReservations,
    (
      state,
      action: { type: "add" | "remove"; payload: MyReservation | string },
    ) => {
      if (action.type === "add") {
        return [...state, action.payload as MyReservation];
      } else if (action.type === "remove") {
        return state.filter((r) => r._id !== action.payload);
      }
      return state;
    },
  );

  // Convert initial strings back to Date objects if needed, or keep as strings
  const [daysWithAvailability, setDaysWithAvailability] = useState<Date[]>(
    initialDaysWithAvailability.map((d) => new Date(d)),
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingSpotId, setLoadingSpotId] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Auto-animate refs for smooth list transitions
  const [spotsListRef] = useAutoAnimate<HTMLDivElement>();

  const fetchAvailableSpots = useCallback(async () => {
    if (!selectedDate) return;
    try {
      const data = await getAvailableSpotsAction(
        format(selectedDate, "yyyy-MM-dd"),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAvailableSpots(data as any);
    } catch (error) {
      console.error("Error fetching available spots:", error);
    }
  }, [selectedDate]);

  const fetchDaysWithAvailability = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const data = await getAvailableDaysAction(
        format(firstDay, "yyyy-MM-dd"),
        format(lastDay, "yyyy-MM-dd"),
      );
      setDaysWithAvailability(data.map((d) => new Date(d)));
    } catch (error) {
      console.error("Error fetching days with availability:", error);
    }
  }, [currentMonth]);

  // Initial fetch removed.
  // Only fetch available spots when selectedDate changes (interaction)
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSpots();
    } else {
      setAvailableSpots([]);
    }
  }, [selectedDate, fetchAvailableSpots]);

  // Fetch days when month changes (interaction)
  useEffect(() => {
    fetchDaysWithAvailability();
  }, [fetchDaysWithAvailability]);

  const handleReserve = (spotId: string) => {
    if (!selectedDate) return;

    // Find the spot for optimistic update
    const spot = availableSpots.find((s) => s._id === spotId);
    if (!spot) return;

    setLoadingSpotId(spotId);

    // Create optimistic reservation object
    const optimisticReservation: MyReservation = {
      _id: `temp-${Date.now()}`,
      date: selectedDate.toISOString(),
      parkingSpot: {
        number: spot.number,
        location: spot.location,
      },
    };

    // Capture spot value for potential rollback (closure captures it)
    const spotForRollback = { ...spot };

    startTransition(async () => {
      // OPTIMISTIC: Add reservation immediately for instant feedback (inside transition)
      setOptimisticReservations({
        type: "add",
        payload: optimisticReservation,
      });

      // Remove from available spots immediately
      setAvailableSpots((prev) => prev.filter((s) => s._id !== spotId));

      try {
        const formData = new FormData();
        formData.append("parkingSpotId", spotId);
        formData.append("date", format(selectedDate, "yyyy-MM-dd"));

        const result = await createReservationAction({}, formData);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "¡Reserva exitosa!",
          description: `Plaza ${spot.number} reservada correctamente`,
        });

        router.refresh();
      } catch (error) {
        // ROLLBACK: Revert optimistic update on error
        setOptimisticReservations({
          type: "remove",
          payload: optimisticReservation._id,
        });
        // Use captured spot value for rollback, but check if it doesn't already exist
        setAvailableSpots((prev) => {
          // Prevent duplicates - only add back if not already present
          if (prev.some((s) => s._id === spotForRollback._id)) {
            return prev;
          }
          return [...prev, spotForRollback];
        });

        toast({
          title: "Error al reservar",
          description:
            error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      } finally {
        setLoadingSpotId(null);
      }
    });
  };

  const handleCancelReservation = (reservationId: string) => {
    if (!confirm("¿Estás seguro de cancelar esta reserva?")) return;

    // Find reservation for potential rollback
    const reservation = optimisticReservations.find(
      (r) => r._id === reservationId,
    );

    // Track which reservation is being cancelled
    setCancellingReservationId(reservationId);

    startTransition(async () => {
      // OPTIMISTIC: Remove immediately for instant feedback (inside transition)
      setOptimisticReservations({ type: "remove", payload: reservationId });

      try {
        const result = await cancelReservationAction(reservationId);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "Reserva cancelada",
          description: "Tu reserva ha sido cancelada correctamente",
        });

        router.refresh();
        fetchAvailableSpots();
      } catch (error) {
        // ROLLBACK: Restore reservation on error
        if (reservation) {
          setOptimisticReservations({ type: "add", payload: reservation });
        }

        toast({
          title: "Error",
          description: "No se pudo cancelar la reserva",
          variant: "destructive",
        });
      } finally {
        setCancellingReservationId(null);
      }
    });
  };

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const monthDays = getMonthDays();

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendario - Centrado y con ancho máximo */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold tracking-tight text-primary-900 mb-4">
          Selecciona un día
        </h2>

        <div className="bg-linear-to-br from-white via-white to-[#fdc373]/5 rounded-2xl p-4 brutal-border brutal-shadow min-h-[200px] flex flex-col">
          {/* Encabezado del mes */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-primary-900 hover:bg-gray-100 transition-colors"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <h3 className="text-sm font-extrabold text-primary-900">
              {format(currentMonth, "MMMM yyyy", { locale: es }).toUpperCase()}
            </h3>
            <button
              onClick={goToNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-primary-900 hover:bg-gray-100 transition-colors"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-bold text-gray-400 uppercase py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isSelected =
                selectedDate &&
                format(date, "yyyy-MM-dd") ===
                  format(selectedDate, "yyyy-MM-dd");
              const isPast = date < startOfDay(new Date());
              const isWeekend = !isWeekday(date);
              const isDisabled = isPast || isWeekend;

              const isReserved = optimisticReservations.some(
                (res) =>
                  format(new Date(res.date), "yyyy-MM-dd") ===
                  format(date, "yyyy-MM-dd"),
              );

              const hasAvailability = daysWithAvailability.some(
                (d) => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
              );

              let bgColor = "bg-white";
              let textColor = "text-primary-900";
              let border = "border-2 border-gray-200";

              if (isSelected) {
                bgColor = "bg-blue-100";
                textColor = "text-primary-900";
                border = "border-2 border-blue-400";
              } else if (isReserved) {
                bgColor = "bg-[#fdc373]/30";
                textColor = "text-primary-900";
                border = "border-2 border-[#fdc373]";
              } else if (hasAvailability && !isDisabled) {
                bgColor = "bg-green-50";
                textColor = "text-green-700";
                border = "border-2 border-green-400";
              } else if (isDisabled) {
                bgColor = "bg-gray-50";
                textColor = "text-gray-300";
                border = "border border-gray-100";
              }

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && setSelectedDate(date)}
                  disabled={isDisabled}
                  className={`aspect-square flex items-center justify-center rounded-lg font-bold text-xs transition-all
                              ${bgColor} ${textColor} ${border} ${
                                !isDisabled && "hover:scale-105"
                              }`}
                >
                  {format(date, "d")}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-auto pt-3 border-t-2 border-gray-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#fdc373]/30 border-2 border-[#fdc373]"></div>
              <span className="text-[10px] text-gray-600 font-medium">
                Tu reserva
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-400"></div>
              <span className="text-[10px] text-gray-600 font-medium">
                Disponibles
              </span>
            </div>
          </div>
        </div>

        {/* Plazas y Reserva para la fecha seleccionada */}
        {selectedDate && (
          <div className="mt-6">
            <h3 className="text-xl font-extrabold tracking-tight text-primary-900 mb-4">
              {format(selectedDate, "PPP", { locale: es })}
            </h3>

            {/* Reserva del usuario para esta fecha (si existe) */}
            {optimisticReservations.find(
              (res) =>
                format(new Date(res.date), "yyyy-MM-dd") ===
                format(selectedDate, "yyyy-MM-dd"),
            ) && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-primary-900 uppercase tracking-wider mb-3">
                  Tu Reserva
                </h4>
                {optimisticReservations
                  .filter(
                    (res) =>
                      format(new Date(res.date), "yyyy-MM-dd") ===
                      format(selectedDate, "yyyy-MM-dd"),
                  )
                  .map((reservation) => (
                    <div
                      key={reservation._id}
                      className="bg-white rounded-2xl p-6 brutal-border brutal-shadow border-2 border-green-500"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-green-600 rounded-xl brutal-border flex items-center justify-center">
                            <span className="text-xl font-mono-data font-bold text-white">
                              {reservation.parkingSpot.location ===
                              "SUBTERRANEO"
                                ? "S"
                                : "E"}
                              -{reservation.parkingSpot.number}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-primary-900 text-lg">
                              Plaza {reservation.parkingSpot.number}
                            </p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                              {reservation.parkingSpot.location ===
                              "SUBTERRANEO"
                                ? "Subterráneo"
                                : "Exterior"}
                            </p>
                          </div>
                        </div>
                        <span className="inline-block px-3 py-1 rounded-lg bg-green-100 text-green-700 font-bold text-xs uppercase whitespace-nowrap">
                          Tu Reserva
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelReservation(reservation._id)}
                        disabled={cancellingReservationId === reservation._id}
                        className="w-full py-3 px-4 rounded-xl bg-white text-red-600 font-bold
                                 border-2 border-red-600 hover:bg-red-50 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2"
                      >
                        {cancellingReservationId === reservation._id ? (
                          <>
                            <span className="brutal-spinner" />
                            Cancelando...
                          </>
                        ) : (
                          "Cancelar Reserva"
                        )}
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Plazas disponibles */}
            {availableSpots.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-primary-900 uppercase tracking-wider mb-3">
                  Plazas Disponibles
                </h4>
                <div
                  ref={spotsListRef}
                  className="grid gap-4 sm:grid-cols-1 md:grid-cols-2"
                >
                  {availableSpots.map((spot) => (
                    <div
                      key={spot._id}
                      className="bg-linear-to-br from-white to-[#fdc373]/10 rounded-2xl p-6 brutal-border brutal-shadow hover:brutal-shadow-accent hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-primary-900 rounded-xl brutal-border flex items-center justify-center shadow-[4px_4px_0_0_#fdc373]">
                            <span className="text-xl font-mono-data font-bold text-white">
                              {spot.location === "SUBTERRANEO" ? "S" : "E"}-
                              {spot.number}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-primary-900 text-lg">
                              Plaza {spot.number}
                            </p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                              {spot.location === "SUBTERRANEO"
                                ? "Subterráneo"
                                : "Exterior"}
                            </p>
                          </div>
                        </div>
                        <span className="inline-block px-3 py-1 rounded-lg bg-[#fdc373] text-primary-900 font-bold text-xs uppercase whitespace-nowrap border-2 border-primary-900">
                          Disponible
                        </span>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">
                          Asignada a
                        </p>
                        <p className="text-sm text-primary-900 font-medium">
                          {spot.assignedToName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleReserve(spot._id)}
                        disabled={loadingSpotId === spot._id || isPending}
                        className="w-full py-3 px-4 rounded-xl bg-[#fdc373] text-primary-900 font-bold
                                 brutal-border brutal-shadow-sm brutal-hover tap-none
                                 hover:shadow-[6px_6px_0_0_#343f48] active:shadow-[2px_2px_0_0_#343f48]
                                 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200
                                 flex items-center justify-center gap-2"
                      >
                        {loadingSpotId === spot._id ? (
                          <>
                            <span className="brutal-spinner brutal-spinner-light" />
                            Reservando...
                          </>
                        ) : (
                          "Reservar"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay plazas disponibles ni reserva */}
            {availableSpots.length === 0 &&
              !optimisticReservations.find(
                (res) =>
                  format(new Date(res.date), "yyyy-MM-dd") ===
                  format(selectedDate!, "yyyy-MM-dd"),
              ) && <EmptyState variant="no-spots" />}
          </div>
        )}
      </div>
    </div>
  );
}
