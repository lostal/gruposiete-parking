'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';

interface NavbarProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  onOpenHistorial?: () => void;
}

export function Navbar({ userName, userEmail, userRole, onOpenHistorial }: NavbarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="border-b-[3px] border-[#343f48] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard">
            <Image
              src="/logo.png"
              alt="Gruposiete"
              width={120}
              height={40}
              className="h-auto w-auto max-w-[120px]"
            />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <div
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors
                          ${
                            pathname === '/dashboard'
                              ? 'bg-[#343f48] text-white'
                              : 'text-gray-600 hover:text-[#343f48]'
                          }`}
              >
                Dashboard
              </div>
            </Link>

            <button
              onClick={onOpenHistorial}
              className="px-3 py-2 rounded-lg font-bold text-sm text-gray-600 hover:text-[#343f48] transition-colors"
            >
              Historial
            </button>

            <button
              onClick={handleSignOut}
              className="ml-2 px-3 py-2 rounded-lg bg-white text-[#343f48] font-bold text-sm border-2 border-[#343f48] hover:bg-[#343f48] hover:text-white transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
