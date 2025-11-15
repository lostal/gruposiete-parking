'use client';

import { useState } from 'react';
import { Navbar } from './navbar';
import { HistorialSidebar } from '../historial-sidebar';
import { UserRole } from '@/types';

interface DashboardWrapperProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  children: React.ReactNode;
}

export function DashboardWrapper({
  userName,
  userEmail,
  userRole,
  children,
}: DashboardWrapperProps) {
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onOpenHistorial={() => setIsHistorialOpen(true)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-6 sm:pt-8">{children}</main>
      <HistorialSidebar isOpen={isHistorialOpen} onClose={() => setIsHistorialOpen(false)} />
    </div>
  );
}
