"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";
import { UserRole } from "@/types";
import {
  updateUserAction,
  changePasswordAction,
  deleteAccountAction,
} from "@/app/actions/user.actions";

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userRole: UserRole;
}

export function ProfileSidebar({
  isOpen,
  onClose,
  userName,
  userEmail,
  userRole,
}: ProfileSidebarProps) {
  const router = useRouter();
  const [name, setName] = useState(userName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateUserAction(name.trim());

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Perfil actualizado",
        description: "Tu nombre ha sido actualizado correctamente",
      });

      // Recargar la página para actualizar el nombre en la navbar
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePasswordAction(currentPassword, newPassword);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente",
      });

      // Limpiar campos
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: "Error",
        description: "Debes ingresar tu contraseña para confirmar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteAccountAction(deletePassword);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido eliminada correctamente",
      });

      // Cerrar sesión y redirigir al login
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeleteWarningMessage = () => {
    if (userRole === UserRole.GENERAL) {
      return "Esta acción no se puede deshacer. Perderás todas tus reservas y no podrás recuperar tu cuenta.";
    } else if (userRole === UserRole.DIRECCION) {
      return "Esta acción no se puede deshacer. Perderás tu plaza asignada, los días que liberaste y no podrás recuperar tu cuenta.";
    }
    return "";
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${isOpen ? "opacity-50" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-white border-l-[3px] border-primary-900
                   transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-primary-900">
                Mi Perfil
              </h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Gestiona tu cuenta
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-white text-primary-900 font-bold text-lg
                       brutal-border hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* User Info */}
          <div className="bg-primary-900 rounded-2xl p-6 brutal-border mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-extrabold text-primary-900">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">{userName}</p>
                <p className="text-sm text-gray-300">{userEmail}</p>
                <span className="inline-block mt-1 px-2 py-1 rounded-lg bg-[#fdc373] text-primary-900 font-bold text-xs uppercase">
                  {userRole === UserRole.GENERAL ? "General" : "Dirección"}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Sección: Editar Nombre */}
            <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
              <h3 className="text-lg font-extrabold text-primary-900 mb-4">
                Cambiar Nombre
              </h3>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary-900 focus:outline-none font-medium"
                    placeholder="Tu nombre"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || name.trim() === userName}
                  className="w-full px-4 py-3 rounded-xl bg-primary-900 text-white font-bold
                           brutal-border brutal-shadow-sm brutal-hover tap-none
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </div>

            {/* Sección: Cambiar Contraseña */}
            <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow">
              <h3 className="text-lg font-extrabold text-primary-900 mb-4">
                Cambiar Contraseña
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary-900 focus:outline-none font-medium"
                    placeholder="Tu contraseña actual"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary-900 focus:outline-none font-medium"
                    placeholder="Mínimo 8 caracteres"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !currentPassword || !newPassword}
                  className="w-full px-4 py-3 rounded-xl bg-primary-900 text-white font-bold
                           brutal-border brutal-shadow-sm brutal-hover tap-none
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Cambiando..." : "Cambiar contraseña"}
                </button>
              </form>
            </div>

            {/* Sección: Eliminar Cuenta */}
            <div className="bg-white rounded-2xl p-6 brutal-border brutal-shadow border-2 border-red-200">
              <h3 className="text-lg font-extrabold text-red-600 mb-2">
                Zona de Peligro
              </h3>
              <p className="text-sm text-gray-600 mb-4 font-medium">
                {getDeleteWarningMessage()}
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-3 rounded-xl bg-white text-red-600 font-bold
                           border-2 border-red-600 hover:bg-red-50 transition-colors"
                >
                  Eliminar mi cuenta
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                    <p className="text-sm font-bold text-red-800 mb-2">
                      ⚠️ ¿Estás completamente seguro?
                    </p>
                    <p className="text-xs text-red-700">
                      Ingresa tu contraseña para confirmar la eliminación
                      permanente de tu cuenta.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Confirma tu contraseña
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-red-300 focus:border-red-500 focus:outline-none font-medium"
                      placeholder="Tu contraseña"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword("");
                      }}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 rounded-xl bg-white text-primary-900 font-bold
                               brutal-border hover:bg-gray-100 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isLoading || !deletePassword}
                      className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold
                               border-2 border-red-600 hover:bg-red-700 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Eliminando..." : "Eliminar definitivamente"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
