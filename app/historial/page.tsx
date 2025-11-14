'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reservation {
  _id: string;
  date: string;
  status: string;
  createdAt: string;
  parkingSpot: {
    number: number;
    location: string;
  };
}

export default function HistorialPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/reservations/my-history');
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

  return (
    <div className="space-y-6">
      <div className="px-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#343f48]">
          Historial de Reservas
        </h1>
        <p className="text-gray-500 mt-1 font-medium">Consulta todas tus reservas</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 brutal-border brutal-shadow text-center">
          <p className="text-gray-400 font-medium">Cargando...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 brutal-border brutal-shadow text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-400 font-medium">No tienes reservas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <div
              key={reservation._id}
              className="bg-white rounded-xl p-4 brutal-border brutal-shadow"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#343f48] rounded-lg brutal-border flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-mono-data font-bold text-white">
                      {reservation.parkingSpot.location === 'SUBTERRANEO' ? 'S' : 'E'}-
                      {reservation.parkingSpot.number}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-[#343f48]">
                      Plaza {reservation.parkingSpot.number}
                    </p>
                    <p className="text-xs text-gray-500 font-bold uppercase">
                      {reservation.parkingSpot.location === 'SUBTERRANEO'
                        ? 'Subterráneo'
                        : 'Exterior'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-gray-400 uppercase tracking-wide font-bold">Fecha</p>
                    <p className="font-bold text-[#343f48]">
                      {format(new Date(reservation.date), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-lg font-bold text-xs uppercase
                                ${
                                  reservation.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                    >
                      {reservation.status === 'ACTIVE' ? 'Activa' : 'Cancelada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
