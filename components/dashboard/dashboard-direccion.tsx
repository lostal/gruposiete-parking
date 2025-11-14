'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardDireccionProps {
  userId: string;
  parkingSpotId?: string;
}

export default function DashboardDireccion({ userId, parkingSpotId }: DashboardDireccionProps) {
  const [parkingSpot, setParkingSpot] = useState<any>(null);
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
      console.error('Error fetching parking spot:', error);
    }
  }, [parkingSpotId]);

  const fetchAvailability = useCallback(async () => {
    try {
      const response = await fetch(`/api/availability?parkingSpotId=${parkingSpotId}`);
      if (response.ok) {
        const data = await response.json();
        const unavailable = data
          .filter((a: any) => !a.isAvailable)
          .map((a: any) => new Date(a.date));
        setUnavailableDates(unavailable);
      }

      const resResponse = await fetch(`/api/reservations?parkingSpotId=${parkingSpotId}`);
      if (resResponse.ok) {
        const resData = await resResponse.json();
        const reserved = resData.map((r: any) => new Date(r.date));
        setReservedDates(reserved);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
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
        title: 'Selecciona fechas',
        description: 'Debes seleccionar al menos una fecha',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parkingSpotId,
          dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
          isAvailable: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al marcar disponibilidad');
      }

      toast({
        title: 'Disponibilidad actualizada',
        description: `Has marcado ${selectedDates.length} día(s) como no disponible`,
      });

      setSelectedDates([]);
      fetchAvailability();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAvailable = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: 'Selecciona fechas',
        description: 'Debes seleccionar al menos una fecha',
        variant: 'destructive',
      });
      return;
    }

    // Verificar si alguna fecha ya está reservada
    const hasReserved = selectedDates.some((date) =>
      reservedDates.some((rd) => startOfDay(rd).getTime() === startOfDay(date).getTime()),
    );

    if (hasReserved) {
      toast({
        title: 'No se puede cambiar',
        description: 'Algunas fechas ya tienen reservas activas',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parkingSpotId,
          dates: selectedDates.map((d) => format(d, 'yyyy-MM-dd')),
          isAvailable: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al marcar disponibilidad');
      }

      toast({
        title: 'Disponibilidad actualizada',
        description: `Has marcado ${selectedDates.length} día(s) como disponible`,
      });

      setSelectedDates([]);
      fetchAvailability();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la disponibilidad',
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

  // Generate calendar for current month starting on Monday
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
          <h3 className="text-2xl font-extrabold text-[#343f48]">No tienes plaza asignada</h3>
          <p className="text-gray-500 font-medium">
            Contacta con un administrador para que te asigne una plaza
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Info de la plaza */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-6">
          Tu Plaza Asignada
        </h2>

        {parkingSpot && (
          <div className="bg-white rounded-2xl p-8 brutal-border brutal-shadow">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-[#343f48] rounded-2xl brutal-border flex items-center justify-center">
                <span className="text-4xl font-mono-data font-bold text-white">
                  {parkingSpot.location === 'SUBTERRANEO' ? 'S' : 'E'}-{parkingSpot.number}
                </span>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-[#343f48]">Plaza {parkingSpot.number}</p>
                <p className="text-lg text-gray-500 font-bold uppercase tracking-wide mt-1">
                  {parkingSpot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Asignada a{' '}
                  <span className="font-bold text-[#343f48]">{parkingSpot.assignedToName}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendario */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-[#343f48] mb-2">
          Gestiona tu plaza
        </h2>
        <div className="bg-[#fdc373]/20 border-l-4 border-[#fdc373] p-3 rounded mb-4">
          <p className="text-sm font-bold text-[#343f48]">
            Marca los días que dejarás tu plaza libre para que otros la puedan reservar
          </p>
        </div>

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

              const isSelected = selectedDates.some((d) => isSameDay(d, date));
              const isUnavailable = isDateUnavailable(date);
              const isReserved = isDateReserved(date);
              const isPast = date < startOfDay(new Date());
              const isWeekend = !isWeekday(date);
              const isDisabled = isPast || isWeekend;

              let bgColor = 'bg-white';
              let textColor = 'text-[#343f48]';
              let border = 'border-2 border-gray-200';
              let title = '';

              if (isSelected) {
                bgColor = 'bg-[#fdc373]';
                textColor = 'text-[#343f48]';
                border = 'border-2 border-[#fdc373]';
                title = 'Seleccionado para marcar';
              } else if (isReserved) {
                bgColor = 'bg-green-50';
                textColor = 'text-green-700';
                border = 'border-2 border-green-200';
                title = 'Ya reservado por alguien';
              } else if (isUnavailable) {
                bgColor = 'bg-red-50';
                textColor = 'text-red-700';
                border = 'border-2 border-red-200';
                title = 'Marcado como libre';
              } else if (isDisabled) {
                bgColor = 'bg-gray-50';
                textColor = 'text-gray-300';
                border = 'border border-gray-100';
                title = 'No disponible';
              } else {
                title = 'Tu plaza está ocupada por ti';
              }

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && toggleDate(date)}
                  disabled={isDisabled}
                  title={title}
                  className={`aspect-square flex items-center justify-center rounded font-bold text-[11px] transition-all
                            ${bgColor} ${textColor} ${border} ${!isDisabled && 'hover:scale-110'}`}
                >
                  {format(date, 'd')}
                </button>
              );
            })}
          </div>

          {/* Leyenda compacta */}
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 text-[9px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-white border-2 border-gray-200 rounded"></div>
              <span className="text-gray-600">Usas tu plaza</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-50 border-2 border-red-200 rounded"></div>
              <span className="text-gray-600">Plaza libre (otros pueden reservar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-50 border-2 border-green-200 rounded"></div>
              <span className="text-gray-600">Ya reservado</span>
            </div>
          </div>
        </div>

        {/* Botones de acción con textos claros */}
        {selectedDates.length > 0 && (
          <div className="mt-3 space-y-2 max-w-sm">
            <button
              onClick={handleMarkUnavailable}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#343f48] text-white font-bold text-sm brutal-border brutal-shadow
                       hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Guardando...'
                : `✓ Dejar libre ${selectedDates.length} día(s) seleccionado(s)`}
            </button>
            <button
              onClick={handleMarkAvailable}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white text-[#343f48] font-bold text-sm brutal-border brutal-shadow
                       hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Guardando...'
                : `✗ Cancelar y usar mi plaza estos ${selectedDates.length} día(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
