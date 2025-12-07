"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { resetPasswordAction, ActionState } from "@/app/actions/auth.actions";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
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

    startTransition(async () => {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("password", password);

      try {
        const result: ActionState = await resetPasswordAction(
          {} as ActionState,
          formData,
        );

        if (result.error) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Contraseña restablecida",
          description: result.message,
        });

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (error) {
        toast({
          title: "Error",
          description: "Ha ocurrido un error inesperado",
          variant: "destructive",
        });
      }
    });
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
          <h2 className="text-3xl font-extrabold tracking-tight text-primary-900 mb-3">
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
                className="block text-sm font-bold text-primary-900 uppercase tracking-wide"
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
                className="w-full py-4 px-5 rounded-xl bg-white text-primary-900 font-medium
                         brutal-border placeholder:text-gray-400"
              />
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-3">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-primary-900 uppercase tracking-wide"
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
                className="w-full py-4 px-5 rounded-xl bg-white text-primary-900 font-medium
                         brutal-border placeholder:text-gray-400"
              />
            </div>

            {/* Indicador de seguridad */}
            {password.length > 0 && (
              <div className="bg-[#fdc373]/20 border-l-4 border-[#fdc373] p-3">
                <p className="text-xs text-primary-900 font-medium">
                  Seguridad de la contraseña:
                </p>
                <ul className="text-xs text-primary-900 mt-1 space-y-1">
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
              disabled={isPending}
              className="w-full py-5 px-6 rounded-2xl bg-[#fdc373] text-primary-900 font-bold text-lg
                       brutal-border brutal-shadow-sm brutal-hover tap-none
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isPending ? "Restableciendo..." : "Restablecer Contraseña"}
            </button>
          </form>

          {/* Link volver */}
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-primary-900 font-bold hover:text-[#fdc373] transition-colors"
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
