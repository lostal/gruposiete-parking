/**
 * Validación de variables de entorno
 * Este archivo valida que todas las variables críticas estén configuradas
 */

interface EnvConfig {
  MONGODB_URI: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  // Upstash Redis para rate limiting (opcional en dev, recomendado en prod)
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Variables REQUERIDAS
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI es requerida');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET es requerida. Genera una con: openssl rand -base64 32');
  }

  // Validaciones adicionales
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    errors.push('MONGODB_URI debe comenzar con "mongodb://" o "mongodb+srv://"');
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET debe tener al menos 32 caracteres');
  }

  // Variables CRÍTICAS en producción
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RESEND_API_KEY) {
      errors.push(
        'RESEND_API_KEY es requerida en producción para envío de notificaciones por email',
      );
    }

    if (!process.env.NEXTAUTH_URL) {
      errors.push('NEXTAUTH_URL es requerida en producción para autenticación correcta');
    }

    // Advertencias (no bloqueantes pero importantes)
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn(
        '⚠️  UPSTASH_REDIS_REST_URL/TOKEN no configurado. Rate limiting usará memoria (NO recomendado en producción).',
      );
    }
  } else {
    // Advertencias en desarrollo
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY no está configurada. Los emails se simularán en consola.');
    }
  }

  // Si hay errores, lanzar excepción
  if (errors.length > 0) {
    throw new Error(
      `❌ Error de configuración de variables de entorno:\n${errors
        .map((e) => `  - ${e}`)
        .join('\n')}\n\nRevisa tu archivo .env.local`,
    );
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

// Validar inmediatamente al importar (solo en servidor)
let env: EnvConfig | undefined;

if (typeof window === 'undefined') {
  try {
    env = validateEnv();
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Variables de entorno validadas correctamente');
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// Exportar función que lanza error si se accede desde el cliente
function getEnv(): EnvConfig {
  if (typeof window !== 'undefined') {
    throw new Error('❌ No se pueden acceder a variables de entorno desde el cliente');
  }
  if (!env) {
    throw new Error('❌ Variables de entorno no inicializadas');
  }
  return env;
}

export default getEnv();
