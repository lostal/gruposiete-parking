"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: "Error",
        description: "Token de restablecimiento no válido",
        variant: "destructive",
      });
      setTimeout(() => router.push("/forgot-password"), 2000);
    }
  }, [searchParams, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Error al restablecer la contraseña",
          variant: "destructive",
        });

        // Si el token expiró, redirigir a solicitar uno nuevo
        if (response.status === 400) {
          setTimeout(() => router.push("/forgot-password"), 3000);
        }
        return;
      }

      toast({
        title: "Contraseña restablecida",
        description: data.message,
      });

      // Redirigir al login
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Validando token...</p>
        </div>
      </div>
    );
  }

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
          <h2 className="text-3xl font-extrabold tracking-tight text-[#343f48] mb-3">
            Nueva Contraseña
          </h2>
          <p className="text-gray-500 mb-8 font-medium">
            Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contraseña */}
            <div className="space-y-3">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-[#343f48] uppercase tracking-wide"
              >
                Nueva Contraseña
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

            {/* Indicador de seguridad */}
            {password.length > 0 && (
              <div className="bg-[#fdc373]/20 border-l-4 border-[#fdc373] p-3">
                <p className="text-xs text-[#343f48] font-medium">
                  Seguridad de la contraseña:
                </p>
                <ul className="text-xs text-[#343f48] mt-1 space-y-1">
                  <li
                    className={
                      password.length >= 8 ? "text-green-600" : "text-gray-500"
                    }
                  >
                    {password.length >= 8 ? "✓" : "○"} Al menos 8 caracteres
                  </li>
                  <li
                    className={
                      password === confirmPassword && confirmPassword.length > 0
                        ? "text-green-600"
                        : "text-gray-500"
                    }
                  >
                    {password === confirmPassword && confirmPassword.length > 0
                      ? "✓"
                      : "○"}{" "}
                    Las contraseñas coinciden
                  </li>
                </ul>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 px-6 rounded-2xl bg-[#fdc373] text-[#343f48] font-bold text-lg
                       brutal-border brutal-shadow-sm brutal-hover tap-none
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? "Restableciendo..." : "Restablecer Contraseña"}
            </button>
          </form>

          {/* Link volver */}
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-[#343f48] font-bold hover:text-[#fdc373] transition-colors"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-500">Cargando...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
