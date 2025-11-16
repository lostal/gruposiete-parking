'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardGeneralProps {
  userId: string;
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

export default function DashboardGeneral({ userId }: DashboardGeneralProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSpots, setAvailableSpots] = useState<AvailableSpot[]>([]);
  const [myReservations, setMyReservations] = useState<MyReservation[]>([]);
  const [daysWithAvailability, setDaysWithAvailability] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchMyReservations = useCallback(async () => {
    try {
      const response = await fetch(`/api/reservations?userId=${userId}&upcoming=true`);
      if (response.ok) {
        const data = await response.json();
        // La API ahora puede devolver { reservations: [], pagination: {} } o un array directo
        const reservationsArray = data.reservations || data;
        // Ordenar por fecha ascendente (de menor a mayor)
        const sortedData = reservationsArray.sort(
          (a: MyReservation, b: MyReservation) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setMyReservations(sortedData);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  }, [userId]);

  const fetchAvailableSpots = useCallback(async () => {
    if (!selectedDate) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/parking-spots/available?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSpots(data);
      }
    } catch (error) {
      console.error('Error fetching available spots:', error);
    }
  }, [selectedDate]);

  const fetchDaysWithAvailability = useCallback(async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startDate = format(firstDay, 'yyyy-MM-dd');
      const endDate = format(lastDay, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/parking-spots/available-days?startDate=${startDate}&endDate=${endDate}`,
      );
      if (response.ok) {
        const data = await response.json();
        setDaysWithAvailability(data.map((dateStr: string) => new Date(dateStr)));
      }
    } catch (error) {
      console.error('Error fetching days with availability:', error);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSpots();
    }
  }, [selectedDate, fetchAvailableSpots]);

  useEffect(() => {
    fetchDaysWithAvailability();
  }, [fetchDaysWithAvailability]);

  const handleReserve = async (spotId: string) => {
    if (!selectedDate) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parkingSpotId: spotId,
          date: format(selectedDate, 'yyyy-MM-dd'),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al reservar');
      }

      toast({
        title: '¡Reserva exitosa!',
        description: `Plaza ${data.reservation.parkingSpot.number} reservada para ${format(
          selectedDate,
          'PPP',
          { locale: es },
        )}`,
      });

      fetchAvailableSpots();
      fetchMyReservations();
      fetchDaysWithAvailability();
    } catch (error) {
      toast({
        title: 'Error al reservar',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al cancelar reserva');
      }

      toast({
        title: 'Reserva cancelada',
        description: 'Tu reserva ha sido cancelada correctamente',
      });

      fetchMyReservations();
      fetchDaysWithAvailability();
      if (selectedDate) {
        fetchAvailableSpots();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la reserva',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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

    // Adjust for Monday start (0 = Sunday, need to convert to Monday = 0)
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday becomes 6

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const monthDays = getMonthDays();

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="space-y-6">
      {/* Calendario - Centrado y con ancho máximo */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-4">
          Selecciona un día
        </h2>

        <div className="bg-white rounded-2xl p-4 brutal-border brutal-shadow min-h-[200px] flex flex-col">
          {/* Encabezado del mes */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#343f48] hover:bg-gray-100 transition-colors"
              aria-label="Mes anterior"
            >
              ←
            </button>
            <h3 className="text-sm font-extrabold text-[#343f48]">
              {format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}
            </h3>
            <button
              onClick={goToNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#343f48] hover:bg-gray-100 transition-colors"
              aria-label="Mes siguiente"
            >
              →
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
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
                selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isPast = date < startOfDay(new Date());
              const isWeekend = !isWeekday(date);
              const isDisabled = isPast || isWeekend;

              const isReserved = myReservations.some(
                (res) => format(new Date(res.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'),
              );

              const hasAvailability = daysWithAvailability.some(
                (d) => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'),
              );

              let bgColor = 'bg-white';
              let textColor = 'text-[#343f48]';
              let border = 'border-2 border-gray-200';

              if (isSelected) {
                bgColor = 'bg-[#343f48]';
                textColor = 'text-white';
                border = 'border-2 border-[#343f48]';
              } else if (isReserved) {
                bgColor = 'bg-green-50';
                textColor = 'text-green-700';
                border = 'border-2 border-green-200';
              } else if (hasAvailability && !isDisabled) {
                bgColor = 'bg-blue-50';
                textColor = 'text-blue-700';
                border = 'border-2 border-blue-200';
              } else if (isDisabled) {
                bgColor = 'bg-gray-50';
                textColor = 'text-gray-300';
                border = 'border border-gray-100';
              }

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && setSelectedDate(date)}
                  disabled={isDisabled}
                  className={`aspect-square flex items-center justify-center rounded-lg font-bold text-xs transition-all
                              ${bgColor} ${textColor} ${border} ${
                    !isDisabled && 'hover:border-[#343f48] hover:scale-105'
                  }`}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-auto pt-3 border-t-2 border-gray-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-200"></div>
              <span className="text-[10px] text-gray-600 font-medium">Tu reserva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-200"></div>
              <span className="text-[10px] text-gray-600 font-medium">Disponibles</span>
            </div>
          </div>
        </div>

        {/* Plazas y Reserva para la fecha seleccionada */}
        {selectedDate && (
          <div className="mt-6">
            <h3 className="text-xl font-extrabold tracking-tight text-[#343f48] mb-4">
              {format(selectedDate, 'PPP', { locale: es })}
            </h3>

            {/* Reserva del usuario para esta fecha (si existe) */}
            {myReservations.find(
              (res) =>
                format(new Date(res.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
            ) && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-[#343f48] uppercase tracking-wider mb-3">
                  Tu Reserva
                </h4>
                {myReservations
                  .filter(
                    (res) =>
                      format(new Date(res.date), 'yyyy-MM-dd') ===
                      format(selectedDate, 'yyyy-MM-dd'),
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
                              {reservation.parkingSpot.location === 'SUBTERRANEO' ? 'S' : 'E'}-
                              {reservation.parkingSpot.number}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-[#343f48] text-lg">
                              Plaza {reservation.parkingSpot.number}
                            </p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                              {reservation.parkingSpot.location === 'SUBTERRANEO'
                                ? 'Subterráneo'
                                : 'Exterior'}
                            </p>
                          </div>
                        </div>
                        <span className="inline-block px-3 py-1 rounded-lg bg-green-100 text-green-700 font-bold text-xs uppercase whitespace-nowrap">
                          Tu Reserva
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelReservation(reservation._id)}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-white text-red-600 font-bold
                                 border-2 border-red-600 hover:bg-red-50 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Cancelando...' : 'Cancelar Reserva'}
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Plazas disponibles */}
            {availableSpots.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-[#343f48] uppercase tracking-wider mb-3">
                  Plazas Disponibles
                </h4>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                  {availableSpots.map((spot) => (
                    <div
                      key={spot._id}
                      className="bg-white rounded-2xl p-6 brutal-border brutal-shadow hover:brutal-shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-[#343f48] rounded-xl brutal-border flex items-center justify-center">
                            <span className="text-xl font-mono-data font-bold text-white">
                              {spot.location === 'SUBTERRANEO' ? 'S' : 'E'}-{spot.number}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-[#343f48] text-lg">Plaza {spot.number}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                              {spot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">
                          Asignada a
                        </p>
                        <p className="text-sm text-[#343f48] font-medium">{spot.assignedToName}</p>
                      </div>
                      <button
                        onClick={() => handleReserve(spot._id)}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-[#fdc373] text-[#343f48] font-bold
                                 brutal-border brutal-shadow-sm brutal-hover tap-none
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Reservando...' : 'Reservar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay plazas disponibles ni reserva */}
            {availableSpots.length === 0 &&
              !myReservations.find(
                (res) =>
                  format(new Date(res.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
              ) && (
                <div className="bg-white rounded-2xl p-8 brutal-border brutal-shadow text-center">
                  <p className="text-gray-400 font-medium">
                    No hay plazas disponibles para esta fecha
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
