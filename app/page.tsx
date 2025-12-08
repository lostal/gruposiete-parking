export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-12">
        {/* Logo + Título */}
        <div className="text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/logo.png"
              alt="Gruposiete"
              width={250}
              height={80}
              className="h-auto w-auto max-w-[250px]"
            />
            <div className="flex items-center gap-3">
              <div className="h-[3px] w-16 bg-[#fdc373] rounded-full"></div>
              <h1 className="text-3xl font-extrabold text-primary-900 tracking-tight">
                PARKING
              </h1>
              <div className="h-[3px] w-16 bg-[#fdc373] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="space-y-4">
          <Link href="/login" className="block">
            <button
              className="w-full py-5 px-6 rounded-2xl bg-primary-900 text-white font-bold text-lg
                             brutal-border brutal-shadow brutal-hover tap-none"
            >
              Iniciar Sesión
            </button>
          </Link>

          <Link href="/registro" className="block">
            <button
              className="w-full py-5 px-6 rounded-2xl bg-white text-primary-900 font-bold text-lg
                             brutal-border brutal-shadow brutal-hover tap-none"
            >
              Crear Cuenta
            </button>
          </Link>
        </div>

        <p className="text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Gruposiete
        </p>
      </div>
    </main>
  );
}
