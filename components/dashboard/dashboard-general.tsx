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
        setMyReservations(data);
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
    } catch (error: any) {
      toast({
        title: 'Error al reservar',
        description: error.message,
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
    <div className="space-y-8">
      {/* Mis Reservas */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-6">Mis Reservas</h2>

        {myReservations.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 brutal-border brutal-shadow text-center">
            <p className="text-gray-400 font-medium">No tienes reservas próximas</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myReservations.map((reservation) => (
              <div
                key={reservation._id}
                className="bg-white rounded-2xl p-6 brutal-border brutal-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#343f48] rounded-xl brutal-border flex items-center justify-center">
                      <span className="text-2xl font-mono-data font-bold text-white">
                        {reservation.parkingSpot.location === 'SUBTERRANEO' ? 'S' : 'E'}-
                        {reservation.parkingSpot.number}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-[#343f48] text-lg">
                        Plaza {reservation.parkingSpot.number}
                      </p>
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                        {reservation.parkingSpot.location === 'SUBTERRANEO'
                          ? 'Subterráneo'
                          : 'Exterior'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {format(new Date(reservation.date), 'PPP', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelReservation(reservation._id)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-white text-[#343f48] font-bold text-sm
                             brutal-border brutal-shadow-sm brutal-hover tap-none
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendario */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-[#343f48] mb-3">
          Selecciona un día
        </h2>

        <div className="bg-white rounded-xl p-3 brutal-border brutal-shadow max-w-sm">
          {/* Encabezado del mes */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={goToPreviousMonth}
              className="w-7 h-7 flex items-center justify-center rounded font-bold text-[#343f48] hover:bg-gray-100 text-sm"
            >
              ←
            </button>
            <h3 className="text-sm font-extrabold text-[#343f48]">
              {format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}
            </h3>
            <button
              onClick={goToNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded font-bold text-[#343f48] hover:bg-gray-100 text-sm"
            >
              →
            </button>
          </div>

          {/* Días de la semana - Empezando por Lunes */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
              <div
                key={day}
                className="text-center text-[9px] font-bold text-gray-400 uppercase py-0.5"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isSelected =
                selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isPast = date < startOfDay(new Date());
              const isWeekend = !isWeekday(date);
              const isDisabled = isPast || isWeekend;

              // Verificar si el usuario tiene una reserva en este día
              const isReserved = myReservations.some(
                (res) => format(new Date(res.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'),
              );

              // Verificar si hay plazas disponibles en este día
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
                  className={`aspect-square flex items-center justify-center rounded font-bold text-[11px] transition-all
                            ${bgColor} ${textColor} ${border} ${
                    !isDisabled && 'hover:border-[#343f48] hover:scale-110'
                  }`}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-50 border-2 border-green-200"></div>
              <span className="text-[9px] text-gray-600 font-medium">Tu reserva</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-50 border-2 border-blue-200"></div>
              <span className="text-[9px] text-gray-600 font-medium">Plazas disponibles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plazas Disponibles */}
      {selectedDate && (
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-[#343f48] mb-4">
            Disponibles para {format(selectedDate, 'PPP', { locale: es })}
          </h3>

          {availableSpots.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 brutal-border brutal-shadow text-center">
              <p className="text-gray-400 font-medium">No hay plazas disponibles para esta fecha</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableSpots.map((spot) => (
                <div
                  key={spot._id}
                  className="bg-white rounded-2xl p-6 brutal-border brutal-shadow"
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
          )}
        </div>
      )}
    </div>
  );
}
