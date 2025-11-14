export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import DashboardGeneral from '@/components/dashboard/dashboard-general';
import DashboardDireccion from '@/components/dashboard/dashboard-direccion';
import DashboardAdmin from '@/components/dashboard/dashboard-admin';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const { role } = session.user;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tighter text-[#343f48]">
          Hola, {session.user.name.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-2 font-medium text-lg">
          {role === UserRole.ADMIN && 'Panel de administración del sistema'}
          {role === UserRole.DIRECCION && 'Gestiona la disponibilidad de tu plaza'}
          {role === UserRole.GENERAL && 'Reserva una plaza disponible'}
        </p>
      </div>

      {role === UserRole.GENERAL && <DashboardGeneral userId={session.user.id} />}
      {role === UserRole.DIRECCION && (
        <DashboardDireccion
          userId={session.user.id}
          parkingSpotId={session.user.assignedParkingSpot}
        />
      )}
      {role === UserRole.ADMIN && <DashboardAdmin />}
    </div>
  );
}
