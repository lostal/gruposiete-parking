import mongoose from 'mongoose';
import env from '@/lib/env';

function getMongoDatabaseURI(): string {
  return env.MONGODB_URI;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    const MONGODB_URI = getMongoDatabaseURI();

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ MongoDB conectado correctamente');
      }
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;

    // Mejorar manejo de errores de MongoDB
    console.error('❌ Error al conectar a MongoDB:', e);

    if (e instanceof Error) {
      // Errores comunes de MongoDB
      if (e.message.includes('authentication failed')) {
        throw new Error('Error de autenticación con MongoDB. Verifica tus credenciales.');
      } else if (e.message.includes('ENOTFOUND') || e.message.includes('ECONNREFUSED')) {
        throw new Error('No se puede conectar a MongoDB. Verifica la URL de conexión.');
      } else if (e.message.includes('timeout')) {
        throw new Error('Timeout al conectar a MongoDB. Verifica tu conexión de red.');
      }
    }

    throw new Error('Error al conectar a la base de datos. Por favor, intenta de nuevo más tarde.');
  }

  return cached.conn;
}

export default dbConnect;
