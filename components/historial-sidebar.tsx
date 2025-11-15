'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reservation {
  _id: string;
  date: string;
  parkingSpot: {
    number: number;
    location: string;
  };
  status: string;
}

interface HistorialSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistorialSidebar({ isOpen, onClose }: HistorialSidebarProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
    }
  }, [isOpen]);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reservations/my-history');
      if (response.ok) {
        const data = await response.json();
        // Ordenar por fecha ascendente (de menor a mayor)
        const sortedData = data.sort((a: Reservation, b: Reservation) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setReservations(sortedData);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setIsLoading(false);
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
                Historial de Reservas
              </h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Consulta todas tus reservas</p>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-white text-[#343f48] font-bold text-lg
                       brutal-border hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400 font-medium">Cargando...</div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 brutal-border brutal-shadow text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400 font-medium">No tienes reservas registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((reservation) => {
                const isPast = new Date(reservation.date) < new Date();
                const isCancelled = reservation.status === 'CANCELLED';

                let statusText = '';
                let statusColor = '';

                if (isCancelled) {
                  statusText = 'Cancelada';
                  statusColor = 'bg-red-100 text-red-700';
                } else if (isPast) {
                  statusText = 'Pasada';
                  statusColor = 'bg-gray-100 text-gray-600';
                } else {
                  statusText = 'Próxima';
                  statusColor = 'bg-green-100 text-green-700';
                }

                return (
                  <div
                    key={reservation._id}
                    className="bg-white rounded-xl p-4 brutal-border brutal-shadow transition-transform hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-[#343f48] rounded-lg brutal-border flex items-center justify-center flex-shrink-0">
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
                        className={`inline-block px-2 py-1 rounded-lg font-bold text-xs uppercase whitespace-nowrap ${statusColor}`}
                      >
                        {statusText}
                      </span>
                    </div>
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
