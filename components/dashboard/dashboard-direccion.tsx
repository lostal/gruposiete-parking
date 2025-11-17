"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardDireccionProps {
  userId: string;
  parkingSpotId?: string;
}

interface ParkingSpot {
  _id: string;
  number: number;
  location: string;
  assignedTo?: string;
  assignedToName?: string;
}

export default function DashboardDireccion({
  userId,
  parkingSpotId,
}: DashboardDireccionProps) {
  const [parkingSpot, setParkingSpot] = useState<ParkingSpot | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [reservedDates, setReservedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchParkingSpot = useCallback(async () => {
    try {
      const response = await fetch(`/api/parking-spots/${parkingSpotId}`);
      if (response.ok) {
        const data = await response.json();
        setParkingSpot(data);
      }
    } catch (error) {
      console.error("Error fetching parking spot:", error);
    }
  }, [parkingSpotId]);

  const fetchAvailability = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/availability?parkingSpotId=${parkingSpotId}`
      );
      if (response.ok) {
        const data = await response.json();
        const unavailable = data
          .filter((a: any) => !a.isAvailable)
          .map((a: any) => new Date(a.date));
        setUnavailableDates(unavailable);
      }

      const resResponse = await fetch(
        `/api/reservations?parkingSpotId=${parkingSpotId}`
      );
      if (resResponse.ok) {
        const resData = await resResponse.json();
        const reservationsArray = resData.reservations || resData;
        const reserved = reservationsArray.map((r: any) => new Date(r.date));
        setReservedDates(reserved);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    }
  }, [parkingSpotId]);

  useEffect(() => {
    if (parkingSpotId) {
      fetchParkingSpot();
      fetchAvailability();
    }
  }, [parkingSpotId, fetchParkingSpot, fetchAvailability]);

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([]);
      return;
    }
    setSelectedDates(dates);
  };

  const handleMarkUnavailable = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: "Selecciona fechas",
        description: "Debes seleccionar al menos una fecha",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkingSpotId,
          dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
          isAvailable: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al marcar disponibilidad");
      }

      toast({
        title: "Disponibilidad actualizada",
        description: `Has marcado ${selectedDates.length} día(s) como no disponible`,
      });

      setSelectedDates([]);
      fetchAvailability();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAvailable = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: "Selecciona fechas",
        description: "Debes seleccionar al menos una fecha",
        variant: "destructive",
      });
      return;
    }

    const hasReserved = selectedDates.some((date) =>
      reservedDates.some(
        (rd) => startOfDay(rd).getTime() === startOfDay(date).getTime()
      )
    );

    if (hasReserved) {
      toast({
        title: "No se puede cambiar",
        description: "Algunas fechas ya tienen reservas activas",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkingSpotId,
          dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
          isAvailable: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al marcar disponibilidad");
      }

      toast({
        title: "Disponibilidad actualizada",
        description: `Has marcado ${selectedDates.length} día(s) como disponible`,
      });

      setSelectedDates([]);
      fetchAvailability();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la disponibilidad",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const toggleDate = (date: Date) => {
    const isSelected = selectedDates.some((d) => isSameDay(d, date));
    if (isSelected) {
      setSelectedDates(selectedDates.filter((d) => !isSameDay(d, date)));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const isDateUnavailable = (date: Date) => {
    return unavailableDates.some((d) => isSameDay(d, date));
  };

  const isDateReserved = (date: Date) => {
    return reservedDates.some((d) => isSameDay(d, date));
  };

  if (!parkingSpotId) {
    return (
      <div className="bg-white rounded-2xl p-12 brutal-border brutal-shadow text-center">
        <div className="space-y-4">
          <div className="text-6xl">⚠️</div>
          <h3 className="text-2xl font-extrabold text-[#343f48]">
            No tienes plaza asignada
          </h3>
          <p className="text-gray-500 font-medium">
            Contacta con un administrador para que te asigne una plaza
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Layout Grid 2 columnas balanceadas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda - Info Plaza */}
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-4">
            Tu Plaza Asignada
          </h2>

          {parkingSpot && (
            <div className="bg-gradient-to-br from-white to-[#fdc373]/10 rounded-2xl p-6 brutal-border brutal-shadow hover:shadow-[8px_8px_0_0_#fdc373] transition-all duration-300">
              <div className="flex items-center gap-6">
                {/* Icono de la plaza */}
                <div className="w-20 h-20 bg-[#343f48] rounded-2xl brutal-border flex items-center justify-center flex-shrink-0 shadow-[6px_6px_0_0_#fdc373]">
                  <span className="text-3xl font-mono-data font-bold text-white">
                    {parkingSpot.location === "SUBTERRANEO" ? "S" : "E"}-
                    {parkingSpot.number}
                  </span>
                </div>

                {/* Info principal */}
                <div className="flex-1">
                  <p className="text-2xl font-extrabold text-[#343f48] mb-1">
                    Plaza {parkingSpot.number}
                  </p>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-3">
                    {parkingSpot.location === "SUBTERRANEO"
                      ? "Subterráneo"
                      : "Exterior"}
                  </p>
                  <div className="pt-3 border-t-2 border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">
                      Asignada a
                    </p>
                    <p className="text-sm font-bold text-[#343f48]">
                      {parkingSpot.assignedToName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de instrucción - Solo visible en desktop */}
          <div className="hidden lg:block mt-4 p-3 bg-[#fdc373]/20 border-l-4 border-[#fdc373] rounded">
            <p className="text-xs font-bold text-[#343f48] leading-relaxed">
              Marca los días que dejarás tu plaza libre para que otros la puedan
              reservar
            </p>
          </div>
        </div>

        {/* Columna Derecha - Calendario */}
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-4">
            Gestiona tu plaza
          </h2>

          {/* Mensaje de instrucción - Solo visible en móvil */}
          <div className="lg:hidden mb-4 p-3 bg-[#fdc373]/20 border-l-4 border-[#fdc373] rounded">
            <p className="text-xs font-bold text-[#343f48] leading-relaxed">
              Marca los días que dejarás tu plaza libre para que otros la puedan
              reservar
            </p>
          </div>

          {/* Calendario */}
          <div className="bg-gradient-to-br from-white via-white to-[#fdc373]/5 rounded-2xl p-4 brutal-border brutal-shadow min-h-[200px] flex flex-col">
            {/* Encabezado del mes */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={goToPreviousMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#343f48] hover:bg-[#fdc373] transition-colors"
                aria-label="Mes anterior"
              >
                ←
              </button>
              <h3 className="text-sm font-extrabold text-[#343f48]">
                {format(currentMonth, "MMMM yyyy", {
                  locale: es,
                }).toUpperCase()}
              </h3>
              <button
                onClick={goToNextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#343f48] hover:bg-[#fdc373] transition-colors"
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
                  return (
                    <div key={`empty-${index}`} className="aspect-square" />
                  );
                }

                const isSelected = selectedDates.some((d) =>
                  isSameDay(d, date)
                );
                const isUnavailable = isDateUnavailable(date);
                const isReserved = isDateReserved(date);
                const isPast = date < startOfDay(new Date());
                const isWeekend = !isWeekday(date);
                const isDisabled = isPast || isWeekend;

                let bgColor = "bg-white";
                let textColor = "text-[#343f48]";
                let border = "border-2 border-gray-200";
                let title = "";

                if (isSelected) {
                  bgColor = "bg-blue-100";
                  textColor = "text-[#343f48]";
                  border = "border-2 border-blue-400";
                  title = "Seleccionado para marcar";
                } else if (isUnavailable && isReserved) {
                  // Plaza libre que YA fue reservada - NO se puede recuperar
                  bgColor = "bg-red-50";
                  textColor = "text-red-700";
                  border = "border-2 border-red-400";
                  title = "Libre y reservada - No recuperable";
                } else if (isUnavailable && !isReserved) {
                  // Plaza libre que AÚN NO está reservada - se puede recuperar
                  bgColor = "bg-[#fdc373]/30";
                  textColor = "text-[#343f48]";
                  border = "border-2 border-[#fdc373]";
                  title = "Libre y disponible - Recuperable";
                } else if (isDisabled) {
                  bgColor = "bg-gray-50";
                  textColor = "text-gray-300";
                  border = "border border-gray-100";
                  title = "No disponible";
                } else {
                  title = "Tu plaza está ocupada por ti";
                }

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isDisabled && toggleDate(date)}
                    disabled={isDisabled}
                    title={title}
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

            {/* Leyenda compacta */}
            <div className="mt-auto pt-3 border-t-2 border-gray-100 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border-2 border-gray-200 rounded"></div>
                <span className="text-[10px] text-gray-600 font-medium">
                  Usas tu plaza
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#fdc373]/30 border-2 border-[#fdc373] rounded"></div>
                <span className="text-[10px] text-gray-600 font-medium">
                  Libre (recuperable)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-50 border-2 border-red-400 rounded"></div>
                <span className="text-[10px] text-gray-600 font-medium">
                  Reservada (no recuperable)
                </span>
              </div>
            </div>

            {/* Botones de acción */}
            {selectedDates.length > 0 && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleMarkUnavailable}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#343f48] text-white font-bold text-sm brutal-border brutal-shadow-sm
                         hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? "Guardando..."
                    : `✓ Dejar libre (${selectedDates.length})`}
                </button>
                <button
                  onClick={handleMarkAvailable}
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white text-[#343f48] font-bold text-sm brutal-border brutal-shadow-sm
                         hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? "Guardando..."
                    : `✗ Usar mi plaza (${selectedDates.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
