"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Error al procesar la solicitud",
          variant: "destructive",
        });
        return;
      }

      setEmailSent(true);
      toast({
        title: "Email enviado",
        description: data.message,
      });
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
          {!emailSent ? (
            <>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#343f48] mb-3">
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="text-gray-500 mb-8 font-medium">
                Ingresa tu email y te enviaremos un enlace para restablecerla.
              </p>

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

                {/* Botón */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 px-6 rounded-2xl bg-[#fdc373] text-[#343f48] font-bold text-lg
                           brutal-border brutal-shadow-sm brutal-hover tap-none
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
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
            </>
          ) : (
            <>
              <div className="text-center space-y-6">
                <div className="text-6xl">📧</div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#343f48]">
                  Revisa tu email
                </h2>
                <p className="text-gray-500 font-medium">
                  Si existe una cuenta con <strong>{email}</strong>, recibirás
                  un enlace para restablecer tu contraseña.
                </p>
                <div className="bg-[#fdc373]/20 border-l-4 border-[#fdc373] p-4 text-left">
                  <p className="text-sm text-[#343f48] font-medium">
                    <strong>⚠️ Importante:</strong>
                  </p>
                  <ul className="text-sm text-[#343f48] mt-2 space-y-1 list-disc list-inside">
                    <li>El enlace expira en 1 hora</li>
                    <li>Revisa también tu carpeta de spam</li>
                    <li>
                      Si no recibes el email, verifica que el correo sea
                      correcto
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setEmail("");
                    }}
                    className="w-full py-4 px-6 rounded-xl bg-white text-[#343f48] font-bold
                             brutal-border brutal-shadow-sm brutal-hover tap-none"
                  >
                    Intentar con otro email
                  </button>

                  <Link
                    href="/login"
                    className="w-full py-4 px-6 rounded-xl bg-[#fdc373] text-[#343f48] font-bold text-center
                             brutal-border brutal-shadow-sm brutal-hover tap-none block"
                  >
                    Volver al inicio de sesión
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
