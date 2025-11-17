/**
 * Rate Limiting simple basado en memoria
 * Para producción con múltiples instancias, considera usar Redis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Map de IP/userId -> datos de rate limit
const limitMap = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  limitMap.forEach((entry, key) => {
    if (entry.resetAt < now) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => limitMap.delete(key));
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  // Identificador único (IP, userId, etc)
  identifier: string;
  // Máximo número de requests permitidos
  limit: number;
  // Ventana de tiempo en segundos
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Verifica si una petición excede el rate limit
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = limitMap.get(config.identifier);

  // Si no existe o expiró, crear nueva entrada
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    limitMap.set(config.identifier, entry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetAt,
    };
  }

  // Incrementar contador
  entry.count++;

  // Verificar si excede el límite
  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Helper para obtener identificador de IP desde request
 */
export function getClientIdentifier(request: Request): string {
  // Intentar obtener IP real (detrás de proxy/CDN)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback a IP directa (en desarrollo)
  return "unknown";
}
