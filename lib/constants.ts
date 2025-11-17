/**
 * Constantes de la aplicación
 * Centraliza todos los valores mágicos para facilitar configuración
 */

// ==================== AUTENTICACIÓN ====================
export const AUTH_CONSTANTS = {
  // Duración de la sesión JWT (en segundos)
  SESSION_MAX_AGE: 24 * 60 * 60, // 24 horas (más seguro que 7 días)
  // Longitud mínima de contraseña
  PASSWORD_MIN_LENGTH: 8,
  // Salt rounds para bcrypt
  BCRYPT_SALT_ROUNDS: 10,
} as const;

// ==================== RATE LIMITING ====================
export const RATE_LIMIT_CONSTANTS = {
  // Registro de usuarios
  REGISTRO: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 15,
  },
  // Creación de reservas
  RESERVACION: {
    MAX_ATTEMPTS: 10,
    WINDOW_MINUTES: 5,
  },
  // API general
  API_GENERAL: {
    MAX_ATTEMPTS: 100,
    WINDOW_MINUTES: 1,
  },
} as const;

// ==================== RESERVAS ====================
export const RESERVATION_CONSTANTS = {
  // Días máximos en el futuro que se puede reservar
  MAX_ADVANCE_DAYS: 60,
  // Paginación por defecto
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

// ==================== DISPONIBILIDAD ====================
export const AVAILABILITY_CONSTANTS = {
  // Máximo de días que se pueden marcar a la vez
  MAX_DATES_PER_REQUEST: 31, // Un mes
  // Delay entre envío de emails (ms) para evitar rate limiting
  EMAIL_DELAY_MS: 100,
} as const;

// ==================== EMAIL ====================
export const EMAIL_CONSTANTS = {
  // Delay entre emails para evitar rate limiting de Resend
  BATCH_DELAY_MS: 100,
  // Máximo de emails por lote
  MAX_BATCH_SIZE: 50,
} as const;

// ==================== DÍAS LABORABLES ====================
export const WEEKDAY_CONSTANTS = {
  // 0 = Domingo, 6 = Sábado
  WEEKEND_DAYS: [0, 6],
  WORKDAY_DAYS: [1, 2, 3, 4, 5], // Lunes a Viernes
} as const;

// ==================== VALIDACIÓN ====================
export const VALIDATION_CONSTANTS = {
  // Dominio de email corporativo permitido
  CORPORATE_EMAIL_DOMAIN: "@gruposiete.es",
  // Longitud máxima de nombre de usuario
  MAX_NAME_LENGTH: 100,
  // Longitud máxima de descripción
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

// ==================== PAGINACIÓN ====================
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// Helper function para verificar día laborable
export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return !WEEKDAY_CONSTANTS.WEEKEND_DAYS.includes(day as 0 | 6);
}

// Helper function para validar email corporativo
export function isValidCorporateEmail(email: string): boolean {
  return email
    .toLowerCase()
    .endsWith(VALIDATION_CONSTANTS.CORPORATE_EMAIL_DOMAIN);
}
