'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AssignedParkingSpot {
  _id: string;
  number: number;
  location: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedParkingSpot?: AssignedParkingSpot;
}

interface ParkingSpot {
  _id: string;
  number: number;
  location: string;
  assignedTo?: string;
  assignedToName?: string;
}

interface ReservationUser {
  _id: string;
  name: string;
  email: string;
}

interface ReservationParkingSpot {
  _id: string;
  number: number;
  location: string;
}

interface Reservation {
  _id: string;
  date: string;
  status: string;
  createdAt: string;
  parkingSpot?: ReservationParkingSpot;
  user?: ReservationUser;
}

export default function DashboardAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, spotsRes, reservationsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/parking-spots'),
        fetch('/api/reservations?limit=10'), // Limitar a 10 reservas recientes
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // La API ahora devuelve { users: [], pagination: {} }
        setUsers(usersData.users || usersData);
      }

      if (spotsRes.ok) {
        const spotsData = await spotsRes.json();
        setParkingSpots(spotsData);
      }

      if (reservationsRes.ok) {
        const reservationsData = await reservationsRes.json();
        // La API ahora devuelve { reservations: [], pagination: {} }
        setReservations(reservationsData.reservations || reservationsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAssignSpot = async (userId: string, spotId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/assign-spot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, spotId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al asignar plaza');
      }

      toast({
        title: 'Plaza asignada',
        description: 'La plaza ha sido asignada correctamente',
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignSpot = async (userId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/unassign-spot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al desasignar plaza');
      }

      toast({
        title: 'Plaza desasignada',
        description: 'La plaza ha sido liberada correctamente',
      });

      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const direccionUsers = users.filter((u) => u.role === 'DIRECCION');
  const generalUsers = users.filter((u) => u.role === 'GENERAL');
  const unassignedSpots = parkingSpots.filter((s) => !s.assignedTo);

  return (
    <div className="space-y-8">
      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Total Usuarios
          </p>
          <p className="text-4xl font-extrabold text-[#343f48]">{users.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {direccionUsers.length} Dirección, {generalUsers.length} General
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Plazas Totales
          </p>
          <p className="text-4xl font-extrabold text-[#343f48]">{parkingSpots.length}</p>
          <p className="text-sm text-gray-500 mt-1">{unassignedSpots.length} sin asignar</p>
        </div>

        <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Reservas Activas
          </p>
          <p className="text-4xl font-extrabold text-[#343f48]">{reservations.length}</p>
          <p className="text-sm text-gray-500 mt-1">Próximas reservas</p>
        </div>
      </div>

      {/* Usuarios de Dirección */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-6">
          Gestión de Usuarios Dirección
        </h2>

        <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
          {direccionUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium">No hay usuarios de dirección registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#343f48]">
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Usuario
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Email
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Plaza Asignada
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {direccionUsers.map((user) => (
                    <tr key={user._id} className="border-b border-gray-200">
                      <td className="py-4 px-4 font-bold text-[#343f48]">{user.name}</td>
                      <td className="py-4 px-4 text-gray-500 font-medium">{user.email}</td>
                      <td className="py-4 px-4">
                        {user.assignedParkingSpot ? (
                          <span className="inline-block px-3 py-1 rounded-lg bg-[#fdc373] text-[#343f48] font-bold text-sm">
                            Plaza {user.assignedParkingSpot.number}
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-lg bg-gray-100 text-gray-500 font-bold text-sm">
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <select
                            onChange={(e) => handleAssignSpot(user._id, e.target.value)}
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg bg-white text-[#343f48] font-bold text-sm
                                     brutal-border disabled:opacity-50 disabled:cursor-not-allowed"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Asignar plaza
                            </option>
                            {parkingSpots.map((spot) => (
                              <option key={spot._id} value={spot._id}>
                                Plaza {spot.number} -{' '}
                                {spot.location === 'SUBTERRANEO' ? 'Subterráneo' : 'Exterior'}
                                {spot.assignedTo && ' (Asignada)'}
                              </option>
                            ))}
                          </select>
                          {user.assignedParkingSpot && (
                            <button
                              onClick={() => handleUnassignSpot(user._id)}
                              disabled={isLoading}
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
      </div>

      {/* Reservas Recientes */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#343f48] mb-6">
          Reservas Recientes
        </h2>

        <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 font-medium">No hay reservas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#343f48]">
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Usuario
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Plaza
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Fecha
                    </th>
                    <th className="text-left py-4 px-4 font-extrabold text-[#343f48] uppercase text-xs tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.slice(0, 10).map((reservation) => (
                    <tr key={reservation._id} className="border-b border-gray-200">
                      <td className="py-4 px-4 font-bold text-[#343f48]">
                        {reservation.user?.name}
                      </td>
                      <td className="py-4 px-4 text-gray-500 font-medium">
                        Plaza {reservation.parkingSpot?.number}
                      </td>
                      <td className="py-4 px-4 text-gray-500 font-medium">
                        {new Date(reservation.date).toLocaleDateString('es-ES')}
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
