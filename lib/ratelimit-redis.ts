/**
 * Rate Limiting con Upstash Redis
 * Solución serverless-friendly para producción
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
let ratelimiters: Map<string, Ratelimit> | null = null;

// Inicializar Redis solo si hay credenciales
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Crear ratelimiters predefinidos
  ratelimiters = new Map([
    [
      "registro",
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 intentos cada 15 minutos
        analytics: true,
        prefix: "@ratelimit/registro",
      }),
    ],
    [
      "reservacion",
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "5 m"), // 10 intentos cada 5 minutos
        analytics: true,
        prefix: "@ratelimit/reservacion",
      }),
    ],
    [
      "api-general",
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests por minuto
        analytics: true,
        prefix: "@ratelimit/api",
      }),
    ],
  ]);
} else if (process.env.NODE_ENV === "production") {
  // CRÍTICO: Redis es OBLIGATORIO en producción para rate limiting
  throw new Error(
    "❌ ERROR CRÍTICO: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son obligatorios en producción.\n" +
      "Rate limiting es esencial para prevenir ataques de fuerza bruta.\n" +
      "Configura estas variables de entorno antes de desplegar a producción.\n" +
      "Crea una cuenta gratuita en: https://upstash.com",
  );
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending?: Promise<unknown>;
}

/**
 * Verifica rate limit usando Upstash Redis
 * Fallback a sistema en memoria en desarrollo
 */
export async function checkRateLimitRedis(
  identifier: string,
  type: "registro" | "reservacion" | "api-general" = "api-general",
): Promise<RateLimitResult> {
  // Si no hay Redis configurado (desarrollo), usar sistema en memoria
  if (!redis || !ratelimiters) {
    if (process.env.NODE_ENV === "development") {
      const { checkRateLimit } = await import("./ratelimit");
      const configs = {
        registro: { limit: 5, windowSeconds: 15 * 60 },
        reservacion: { limit: 10, windowSeconds: 5 * 60 },
        "api-general": { limit: 100, windowSeconds: 60 },
      };
      return checkRateLimit({ identifier, ...configs[type] });
    }

    // En producción sin Redis, permitir pero loguear
    console.error("❌ Rate limiting no disponible - Redis no configurado");
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    };
  }

  const ratelimiter = ratelimiters.get(type);
  if (!ratelimiter) {
    throw new Error(`Rate limiter type '${type}' no encontrado`);
  }

  try {
    const result = await ratelimiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      pending: result.pending,
    };
  } catch (error) {
    console.error("Error en rate limiting:", error);
    // Fallback: permitir request si Redis falla (fail open)
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now(),
    };
  }
}

/**
 * Helper para obtener identificador de cliente desde request
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

  // En desarrollo o si no hay IP, usar user-agent como fallback
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `ua:${userAgent.slice(0, 50)}`; // Limitar longitud
}

/**
 * Middleware helper para rate limiting
 */
export async function withRateLimit(
  request: Request,
  identifier: string,
  type: "registro" | "reservacion" | "api-general",
): Promise<Response | null> {
  const result = await checkRateLimitRedis(identifier, type);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Demasiados intentos. Intenta de nuevo más tarde.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  return null; // No hay error, continuar
}
