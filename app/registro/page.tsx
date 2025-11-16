'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserRole } from '@/types';

export default function RegistroPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.GENERAL);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 8 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Error al registrar usuario',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Registro exitoso',
        description:
          role === UserRole.DIRECCION
            ? 'Un administrador debe asignarte una plaza. Mientras tanto, puedes iniciar sesión.'
            : 'Ya puedes iniciar sesión con tus credenciales',
      });

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-10">
        {/* Logo */}
        <Link href="/" className="block">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Gruposiete"
              width={180}
              height={60}
              className="h-auto w-auto max-w-[180px]"
            />
          </div>
        </Link>

        {/* Formulario */}
        <div className="bg-white rounded-3xl p-8 md:p-10 brutal-border brutal-shadow">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#343f48] mb-8">
            Crear Cuenta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div className="space-y-3">
              <label
                htmlFor="name"
                className="block text-sm font-bold text-[#343f48] uppercase tracking-wide"
              >
                Nombre Completo
              </label>
              <input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full py-4 px-5 rounded-xl bg-white text-[#343f48] font-medium
                         brutal-border placeholder:text-gray-400"
              />
            </div>

            {/* Email */}
            <div className="space-y-3">
              <label
                htmlFor="email"
                className="block text-sm font-bold text-[#343f48] uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="tu-email@gruposiete.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-4 px-5 rounded-xl bg-white text-[#343f48] font-medium
                         brutal-border placeholder:text-gray-400"
              />
            </div>

            {/* Tipo de Usuario */}
            <div className="space-y-3">
              <label
                htmlFor="role"
                className="block text-sm font-bold text-[#343f48] uppercase tracking-wide"
              >
                Tipo de Usuario
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full py-4 px-5 rounded-xl bg-white text-[#343f48] font-medium
                         brutal-border"
              >
                <option value={UserRole.GENERAL}>Usuario General (sin plaza asignada)</option>
                <option value={UserRole.DIRECCION}>Dirección (con plaza asignada)</option>
              </select>
              {role === UserRole.DIRECCION && (
                <p className="text-xs text-gray-500">
                  Un administrador debe asignarte una plaza específica después del registro.
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div className="space-y-3">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-[#343f48] uppercase tracking-wide"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full py-4 px-5 rounded-xl bg-white text-[#343f48] font-medium
                         brutal-border placeholder:text-gray-400"
              />
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-3">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-[#343f48] uppercase tracking-wide"
              >
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full py-4 px-5 rounded-xl bg-white text-[#343f48] font-medium
                         brutal-border placeholder:text-gray-400"
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 px-6 rounded-2xl bg-[#fdc373] text-[#343f48] font-bold text-lg
                       brutal-border brutal-shadow-sm brutal-hover tap-none
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          {/* Link login */}
          <div className="mt-8 text-center">
            <span className="text-gray-500">¿Ya tienes cuenta? </span>
            <Link
              href="/login"
              className="text-[#343f48] font-bold hover:text-[#fdc373] transition-colors"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
