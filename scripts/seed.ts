// IMPORTANTE: Cargar variables de entorno ANTES de cualquier import
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

import dbConnect from '@/lib/db/mongodb';
import ParkingSpot from '@/models/ParkingSpot';
import User from '@/models/User';
import { ParkingLocation, UserRole } from '@/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const parkingSpots = [
  // Subterráneo
  { number: 15, location: ParkingLocation.SUBTERRANEO, assignedToName: 'Juan Carlos' },
  { number: 16, location: ParkingLocation.SUBTERRANEO, assignedToName: 'Pedro Luis' },
  { number: 17, location: ParkingLocation.SUBTERRANEO, assignedToName: 'Álvaro' },
  { number: 18, location: ParkingLocation.SUBTERRANEO, assignedToName: 'Cristina' },
  { number: 19, location: ParkingLocation.SUBTERRANEO, assignedToName: 'Jose' },

  // Exterior
  { number: 13, location: ParkingLocation.EXTERIOR, assignedToName: 'Yolanda' },
  { number: 14, location: ParkingLocation.EXTERIOR, assignedToName: 'Pablo' },
  { number: 49, location: ParkingLocation.EXTERIOR, assignedToName: 'Raúl' },
  { number: 50, location: ParkingLocation.EXTERIOR, assignedToName: 'Visitas' },
];

async function seed() {
  try {
    console.log('🌱 Iniciando seed de base de datos...');

    await dbConnect();
    console.log('✅ Conectado a MongoDB');

    // Limpiar base de datos
    await ParkingSpot.deleteMany({});
    console.log('🧹 Plazas de parking eliminadas');

    // Crear plazas de parking
    const createdSpots = await ParkingSpot.insertMany(parkingSpots);
    console.log(`✅ ${createdSpots.length} plazas de parking creadas`);

    // Crear usuario admin inicial (tú)
    const adminExists = await User.findOne({ role: UserRole.ADMIN });
    if (!adminExists) {
      // Preferir contraseña desde variable de entorno para evitar hardcode
      const adminPlain = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(adminPlain, 10);
      const admin = await User.create({
        name: 'Administrador',
        email: 'admin@gruposiete.es',
        password: hashedPassword,
        role: UserRole.ADMIN,
      });
      console.log('✅ Usuario admin creado:', admin.email);
      console.log('⚠️  Contraseña temporal generada.');
      console.log(
        '⚠️  Usa la variable SEED_ADMIN_PASSWORD para controlar la contraseña al crear el seed.',
      );
      console.log(`ℹ️  Contraseña temporal: ${adminPlain}`);
    } else {
      console.log('ℹ️  Usuario admin ya existe');
    }

    console.log('\n✨ Seed completado con éxito!');
    console.log('\n📋 Resumen:');
    console.log(`   - ${createdSpots.length} plazas de parking`);
    console.log(`   - 1 usuario admin`);
    console.log('\n🔐 Credenciales de admin:');
    console.log('   Email: admin@gruposiete.es');
    console.log(
      '   Nota: la contraseña se genera o se toma desde SEED_ADMIN_PASSWORD. Revisa el output anterior.',
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
