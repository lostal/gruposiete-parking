import { cn } from "@/lib/utils";
import {
  CalendarX,
  CarFront,
  AlertCircle,
  Inbox,
  type LucideIcon,
} from "lucide-react";

type EmptyStateVariant = "no-spots" | "no-reservations" | "error" | "empty";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  className?: string;
  icon?: LucideIcon;
}

const variantConfig: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  "no-spots": {
    icon: CarFront,
    title: "Sin plazas disponibles",
    description: "No hay plazas de parking disponibles para esta fecha",
  },
  "no-reservations": {
    icon: CalendarX,
    title: "Sin reservas",
    description: "No tienes reservas para mostrar",
  },
  error: {
    icon: AlertCircle,
    title: "Error",
    description: "Ha ocurrido un error. Inténtalo de nuevo más tarde.",
  },
  empty: {
    icon: Inbox,
    title: "Nada aquí",
    description: "No hay elementos para mostrar",
  },
};

export function EmptyState({
  variant = "empty",
  title,
  description,
  className,
  icon: CustomIcon,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-8 brutal-border brutal-shadow text-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Icon with brutalista styling */}
        <div className="w-20 h-20 bg-gray-100 brutal-border rounded-2xl flex items-center justify-center shadow-[4px_4px_0_0_#fdc373]">
          <Icon className="w-10 h-10 text-gray-400" strokeWidth={2.5} />
        </div>

        {/* Text content */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-primary-900">{displayTitle}</h3>
          <p className="text-sm text-gray-500 max-w-[280px]">
            {displayDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
