import { format, isWeekend, startOfDay, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "PPP", { locale: es });
}

export function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

export function getNextWeekday(date: Date = new Date()): Date {
  let nextDay = addDays(startOfDay(date), 1);
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
}

export function normalizeDate(date: Date | string): Date {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return startOfDay(dateObj);
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getTime() === d2.getTime();
}

/**
 * Parsea un string 'YYYY-MM-DD' a Date en UTC medianoche.
 * Evita problemas de timezone al crear fechas desde strings sin hora.
 * Esto es crucial para evitar errores de "off-by-one" donde una fecha
 * como "2024-01-15" se convierte en "2024-01-14T23:00:00Z" en ciertas zonas horarias.
 */
export function parseDateStringUTC(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Normaliza una fecha a UTC medianoche.
 * Útil para comparaciones consistentes de fechas.
 */
export function toUTCMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  );
}
