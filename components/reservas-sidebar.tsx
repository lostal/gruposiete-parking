'use client';

import { useState, useEffect } from 'react';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Reservation {
  _id: string;
  date: string;
  parkingSpot: {
    number: number;
    location: string;
  };
  status: string;
}

interface ReservasSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onReservationCancelled?: () => void;
}

type Tab = 'activas' | 'pasadas' | 'canceladas';

export function ReservasSidebar({ isOpen, onClose, onReservationCancelled }: ReservasSidebarProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('activas');
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
    }
  }, [isOpen]);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reservations/all-history');
      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    setIsCancelling(true);

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

      // Recargar la página para actualizar el calendario del dashboard
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la reserva',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const today = startOfDay(new Date());

  const filteredReservations = reservations
    .filter((reservation) => {
      const reservationDate = startOfDay(new Date(reservation.date));
      const isFuture = reservationDate >= today;
      const isPast = reservationDate < today;
      const isCancelled = reservation.status === 'CANCELLED';

      if (activeTab === 'activas') {
        return isFuture && !isCancelled;
      } else if (activeTab === 'pasadas') {
        return isPast && !isCancelled;
      } else {
        return isCancelled;
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ordenar por fecha ascendente

  const getTabCount = (tab: Tab) => {
    const reservationDate = (res: Reservation) => startOfDay(new Date(res.date));
    const isFuture = (res: Reservation) => reservationDate(res) >= today;
    const isPast = (res: Reservation) => reservationDate(res) < today;
    const isCancelled = (res: Reservation) => res.status === 'CANCELLED';

    if (tab === 'activas') {
      return reservations.filter((res) => isFuture(res) && !isCancelled(res)).length;
    } else if (tab === 'pasadas') {
      return reservations.filter((res) => isPast(res) && !isCancelled(res)).length;
    } else {
      return reservations.filter((res) => isCancelled(res)).length;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-white border-l-[3px] border-[#343f48]
                   transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
                     isOpen ? 'translate-x-0' : 'translate-x-full'
                   }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48]">
                Mis Reservas
              </h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Gestiona tus reservas de parking
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-white text-[#343f48] font-bold text-lg
                       brutal-border hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('activas')}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all
                       ${
                         activeTab === 'activas'
                           ? 'bg-[#343f48] text-white'
                           : 'bg-white text-[#343f48] brutal-border hover:bg-[#fdc373]'
                       }`}
            >
              Activas ({getTabCount('activas')})
            </button>
            <button
              onClick={() => setActiveTab('pasadas')}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all
                       ${
                         activeTab === 'pasadas'
                           ? 'bg-[#343f48] text-white'
                           : 'bg-white text-[#343f48] brutal-border hover:bg-[#fdc373]'
                       }`}
            >
              Pasadas ({getTabCount('pasadas')})
            </button>
            <button
              onClick={() => setActiveTab('canceladas')}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all
                       ${
                         activeTab === 'canceladas'
                           ? 'bg-[#343f48] text-white'
                           : 'bg-white text-[#343f48] brutal-border hover:bg-[#fdc373]'
                       }`}
            >
              Canceladas ({getTabCount('canceladas')})
            </button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400 font-medium">Cargando...</div>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 brutal-border brutal-shadow text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400 font-medium">
                {activeTab === 'activas' && 'No tienes reservas activas'}
                {activeTab === 'pasadas' && 'No tienes reservas pasadas'}
                {activeTab === 'canceladas' && 'No tienes reservas canceladas'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map((reservation) => {
                const isCancelled = reservation.status === 'CANCELLED';
                const isActive = activeTab === 'activas';

                return (
                  <div
                    key={reservation._id}
                    className={`bg-white rounded-xl p-4 brutal-border brutal-shadow transition-all hover:scale-[1.02] ${
                      isActive ? 'hover:shadow-[6px_6px_0_0_#fdc373]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-12 h-12 bg-[#343f48] rounded-lg brutal-border flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'shadow-[3px_3px_0_0_#fdc373]' : ''
                        }`}>
                          <span className="text-lg font-mono-data font-bold text-white">
                            {reservation.parkingSpot.location === 'SUBTERRANEO' ? 'S' : 'E'}-
                            {reservation.parkingSpot.number}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#343f48]">
                            Plaza {reservation.parkingSpot.number}
                          </p>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                            {reservation.parkingSpot.location === 'SUBTERRANEO'
                              ? 'Subterráneo'
                              : 'Exterior'}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {format(new Date(reservation.date), 'PPP', { locale: es })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded-lg font-bold text-xs uppercase whitespace-nowrap border-2 ${
                          isCancelled
                            ? 'bg-red-100 text-red-700 border-red-700'
                            : isActive
                            ? 'bg-[#fdc373] text-[#343f48] border-[#343f48]'
                            : 'bg-gray-100 text-gray-600 border-gray-400'
                        }`}
                      >
                        {isCancelled ? 'Cancelada' : isActive ? 'Activa' : 'Pasada'}
                      </span>
                    </div>

                    {/* Botón cancelar solo para reservas activas */}
                    {isActive && (
                      <button
                        onClick={() => handleCancelReservation(reservation._id)}
                        disabled={isCancelling}
                        className="w-full px-4 py-2 rounded-lg bg-white text-red-600 font-bold text-sm
                                 border-2 border-red-600 hover:bg-red-50 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCancelling ? 'Cancelando...' : 'Cancelar Reserva'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
