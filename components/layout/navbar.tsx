'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import { useState, useEffect } from 'react';
import { User, LogOut, Menu, X, Clock } from 'lucide-react';

interface NavbarProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  onOpenHistorial?: () => void;
}

export function Navbar({ userName, userEmail, userRole, onOpenHistorial }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cerrar menú móvil cuando cambia la ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevenir scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      <nav className="border-b-[3px] border-[#343f48] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Gruposiete"
                width={120}
                height={40}
                className="h-auto w-auto max-w-[100px] sm:max-w-[120px]"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              {/* Historial - Solo para GENERAL */}
              {userRole === UserRole.GENERAL && (
                <button
                  onClick={onOpenHistorial}
                  className="px-4 py-2 rounded-lg font-bold text-sm text-[#343f48] hover:bg-gray-100 transition-all flex items-center gap-2"
                  aria-label="Ver historial"
                >
                  <Clock size={18} />
                  <span>Historial</span>
                </button>
              )}

              {/* Perfil (placeholder) */}
              <button
                className="px-4 py-2 rounded-lg font-bold text-sm text-[#343f48] hover:bg-gray-100 transition-all flex items-center gap-2"
                aria-label="Perfil"
                title="Próximamente: edita tu perfil"
              >
                <User size={18} />
                <span>Perfil</span>
              </button>

              {/* Salir */}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-[#343f48] text-white font-bold text-sm border-2 border-[#343f48] hover:bg-white hover:text-[#343f48] transition-all flex items-center gap-2"
                aria-label="Cerrar sesión"
              >
                <LogOut size={18} />
                <span>Salir</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#343f48] hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-all duration-300
          ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Sliding Panel */}
      <div
        className={`
          fixed top-[64px] right-0 bottom-0 w-[280px] bg-white border-l-[3px] border-[#343f48] z-40 md:hidden
          transition-transform duration-300 ease-out overflow-y-auto
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="pb-4 border-b-2 border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#343f48] rounded-full flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#343f48] truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            {/* Historial - Solo para GENERAL */}
            {userRole === UserRole.GENERAL && (
              <button
                onClick={onOpenHistorial}
                className="w-full px-4 py-3 rounded-xl font-bold text-left text-[#343f48] hover:bg-gray-100 transition-all flex items-center gap-3 brutal-border"
              >
                <Clock size={20} />
                <span>Historial</span>
              </button>
            )}

            {/* Perfil (placeholder) */}
            <button
              className="w-full px-4 py-3 rounded-xl font-bold text-left text-[#343f48] hover:bg-gray-100 transition-all flex items-center gap-3 brutal-border"
              title="Próximamente: edita tu perfil"
            >
              <User size={20} />
              <span>Mi Perfil</span>
              <span className="ml-auto text-xs bg-[#fdc373] px-2 py-1 rounded-full">Próximamente</span>
            </button>

            {/* Salir */}
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 rounded-xl bg-[#343f48] text-white font-bold hover:bg-[#2a343b] transition-all flex items-center gap-3 brutal-border brutal-shadow-sm"
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
