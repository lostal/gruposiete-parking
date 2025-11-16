/* eslint-disable prettier/prettier */
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Error',
          description: 'Email o contraseña incorrectos',
          variant: 'destructive',
        });
      } else {
        router.push('/dashboard');
        router.refresh();
      }
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
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 px-6 rounded-2xl bg-[#fdc373] text-[#343f48] font-bold text-lg
                       brutal-border brutal-shadow-sm brutal-hover tap-none
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Iniciando...' : 'Entrar'}
            </button>
          </form>

          {/* Link olvidé contraseña */}
          <div className="mt-6 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-500 hover:text-[#343f48] font-medium transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Link registro */}
          <div className="mt-4 text-center">
            <span className="text-gray-500">¿No tienes cuenta? </span>
            <Link
              href="/registro"
              className="text-[#343f48] font-bold hover:text-[#fdc373] transition-colors"
            >
              Regístrate
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
