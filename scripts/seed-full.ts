/**
 * SEED COMPLETO PARA DESARROLLO LOCAL
 *
 * ADVERTENCIA: Este script elimina TODOS los datos y crea datos de prueba.
 * SOLO debe ejecutarse en entornos de desarrollo LOCAL.
 *
 * Características de seguridad:
 * - Verifica que NODE_ENV no sea 'production'
 * - Valida que la URI de MongoDB sea de desarrollo
 * - Requiere confirmación manual
 *
 * Para ejecutar: npm run seed:full
 */

// Cargar variables de entorno
import dotenv from 'dotenv';
import path from 'path';

// Cargar .env.local primero, luego .env como fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import User from '../models/User';
import ParkingSpot from '../models/ParkingSpot';
import Reservation from '../models/Reservation';
import Availability from '../models/Availability';
import { UserRole, ParkingLocation, ReservationStatus } from '../types';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  error: (msg: string) => console.error(`${colors.red}${colors.bright}ERROR:${colors.reset} ${msg}`),
  warning: (msg: string) => console.warn(`${colors.yellow}${colors.bright}ADVERTENCIA:${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}${colors.bright}✓${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}${colors.bright}→${colors.reset} ${msg}`),
};

// ============================================================================
// PROTECCIONES DE SEGURIDAD
// ============================================================================

/**
 * Verifica que estamos en un entorno seguro para ejecutar el seed
 */
function verificarEntornoSeguro(): void {
  // 1. Verificar NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    log.error('Este script NO puede ejecutarse en producción (NODE_ENV=production)');
    process.exit(1);
  }

  // 2. Verificar que existe MONGODB_URI
  if (!process.env.MONGODB_URI) {
    log.error('MONGODB_URI no está configurado en las variables de entorno');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI.toLowerCase();

  // 3. Verificar que NO sea una URI de producción
  const produccionKeywords = ['prod', 'production', 'live', 'deploy'];
  const contieneProduccion = produccionKeywords.some(keyword => mongoUri.includes(keyword));

  if (contieneProduccion) {
    log.error('La URI de MongoDB parece ser de PRODUCCIÓN');
    log.error(`Palabras detectadas: ${produccionKeywords.filter(k => mongoUri.includes(k)).join(', ')}`);
    log.error('Por seguridad, el seed no se ejecutará');
    process.exit(1);
  }

  // 4. Advertencia sobre la URI
  const uriCensurada = process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  log.info(`Conectando a: ${uriCensurada}`);

  log.success('Verificaciones de seguridad pasadas');
}

/**
 * Solicita confirmación manual al usuario
 */
async function solicitarConfirmacion(): Promise<boolean> {
  // Si existe SEED_AUTO_CONFIRM, saltar la confirmación interactiva
  if (process.env.SEED_AUTO_CONFIRM === 'true') {
    console.log('');
    log.warning('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log.warning('Este script eliminará TODOS los datos de la base de datos');
    log.warning('y los reemplazará con datos de prueba.');
    log.warning('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    log.info('Auto-confirmación activada (SEED_AUTO_CONFIRM=true)');
    console.log('');
    return true;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('');
    log.warning('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log.warning('Este script eliminará TODOS los datos de la base de datos');
    log.warning('y los reemplazará con datos de prueba.');
    log.warning('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    rl.question('¿Estás seguro de que quieres continuar? (escribe "SI" para confirmar): ', (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === 'SI');
    });
  });
}

// ============================================================================
// DATOS DE SEED
// ============================================================================

// Password común para todos los usuarios de prueba
const DEFAULT_PASSWORD = 'Password123!';

// Usuarios de dirección (9 usuarios genéricos)
// Nota: Estos son solo para simular datos. En producción, se crean usuarios reales.
const usuariosDireccion = [
  'Adrián Martínez',
  'Bruno González',
  'Cristian Fernández',
  'Diego López',
  'Emilio Sánchez',
  'Felipe Ruiz',
  'Gustavo Torres',
  'Héctor Navarro',
  'Iván Morales',
];

// Usuarios generales (25)
const usuariosGenerales = [
  'María González',
  'Carlos Rodríguez',
  'Ana Martín',
  'David Jiménez',
  'Laura Pérez',
  'Javier Moreno',
  'Elena Álvarez',
  'Miguel Romero',
  'Carmen Alonso',
  'Francisco Gutiérrez',
  'Isabel Díaz',
  'Antonio Muñoz',
  'Lucía Hernández',
  'Manuel Serrano',
  'Rosa Blanco',
  'Jorge Castro',
  'Pilar Ortega',
  'Ramón Delgado',
  'Teresa Molina',
  'Sergio Vega',
  'Beatriz Ramos',
  'Alberto Gil',
  'Silvia Méndez',
  'Ricardo Vargas',
  'Mónica Cortés',
];

// Plazas de parking (solo número y ubicación, sin nombres predefinidos)
const plazasParking = [
  // Subterráneo
  { number: 15, location: ParkingLocation.SUBTERRANEO },
  { number: 16, location: ParkingLocation.SUBTERRANEO },
  { number: 17, location: ParkingLocation.SUBTERRANEO },
  { number: 18, location: ParkingLocation.SUBTERRANEO },
  { number: 19, location: ParkingLocation.SUBTERRANEO },
  // Exterior
  { number: 13, location: ParkingLocation.EXTERIOR },
  { number: 14, location: ParkingLocation.EXTERIOR },
  { number: 49, location: ParkingLocation.EXTERIOR },
  { number: 50, location: ParkingLocation.EXTERIOR },
];

// ============================================================================
// FUNCIONES DE SEED
// ============================================================================

/**
 * Genera un email corporativo a partir de un nombre
 */
function generarEmail(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .split(' ')[0] + // Tomar primer nombre
    '@gruposiete.es';
}

/**
 * Genera fechas aleatorias para reservas
 * @param cantidad - Número de fechas a generar
 * @param diasAtras - Días hacia atrás (desde hoy)
 * @param diasAdelante - Días hacia adelante (desde hoy)
 */
function generarFechas(cantidad: number, diasAtras: number, diasAdelante: number): Date[] {
  const fechas: Date[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let i = 0; i < cantidad; i++) {
    const diasOffset = Math.floor(Math.random() * (diasAtras + diasAdelante)) - diasAtras;
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + diasOffset);
    fechas.push(fecha);
  }

  return fechas;
}

/**
 * Crea usuarios de dirección
 */
async function crearUsuariosDireccion() {
  log.step('Creando usuarios de dirección...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const usuarios = [];

  for (const nombre of usuariosDireccion) {
    const email = generarEmail(nombre);
    const user = await User.create({
      name: nombre,
      email,
      password: hashedPassword,
      role: UserRole.DIRECCION,
    });
    usuarios.push(user);
    log.info(`  • ${nombre} (${email})`);
  }

  log.success(`${usuarios.length} usuarios de dirección creados`);
  return usuarios;
}

/**
 * Crea usuarios generales
 */
async function crearUsuariosGenerales() {
  log.step('Creando usuarios generales...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const usuarios = [];

  for (const nombre of usuariosGenerales) {
    const email = generarEmail(nombre);
    const user = await User.create({
      name: nombre,
      email,
      password: hashedPassword,
      role: UserRole.GENERAL,
    });
    usuarios.push(user);
    log.info(`  • ${nombre} (${email})`);
  }

  log.success(`${usuarios.length} usuarios generales creados`);
  return usuarios;
}

/**
 * Crea usuario administrador
 */
async function crearAdmin() {
  log.step('Creando usuario administrador...');

  const adminEmail = 'admin@gruposiete.es';
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    log.info('  • Admin ya existe, omitiendo...');
    return existingAdmin;
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await User.create({
    name: 'Administrador',
    email: adminEmail,
    password: hashedPassword,
    role: UserRole.ADMIN,
  });

  log.success(`Admin creado: ${adminEmail}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    log.warning(`  ⚠ Usando password por defecto: ${DEFAULT_PASSWORD}`);
  }

  return admin;
}

/**
 * Crea las plazas de parking y las asigna dinámicamente a usuarios de dirección
 */
async function crearPlazasParking() {
  log.step('Creando plazas de parking...');

  // Obtener todos los usuarios de dirección
  const usuariosDireccion = await User.find({ role: UserRole.DIRECCION }).sort({ createdAt: 1 });

  if (usuariosDireccion.length < plazasParking.length) {
    log.warning(`  ⚠ Solo hay ${usuariosDireccion.length} usuarios de dirección para ${plazasParking.length} plazas`);
  }

  const plazas = [];

  for (let i = 0; i < plazasParking.length; i++) {
    const plazaData = plazasParking[i];

    // Asignar usuario de dirección si hay suficientes
    const usuarioAsignado = i < usuariosDireccion.length ? usuariosDireccion[i] : null;

    // Crear la plaza
    const plaza = await ParkingSpot.create({
      number: plazaData.number,
      location: plazaData.location,
      assignedTo: usuarioAsignado?._id,
      assignedToName: usuarioAsignado?.name,
    });

    // Si hay usuario asignado, actualizar el usuario con la plaza asignada
    if (usuarioAsignado) {
      await User.findByIdAndUpdate(usuarioAsignado._id, {
        assignedParkingSpot: plaza._id,
      });
      log.info(`  • Plaza ${plaza.number} (${plaza.location}) → ${usuarioAsignado.name}`);
    } else {
      log.info(`  • Plaza ${plaza.number} (${plaza.location}) → Sin asignar`);
    }

    plazas.push(plaza);
  }

  log.success(`${plazas.length} plazas creadas y asignadas`);
  return plazas;
}

/**
 * Crea reservas variadas
 */
async function crearReservas() {
  log.step('Creando reservas...');

  const usuariosGenerales = await User.find({ role: UserRole.GENERAL });
  const plazas = await ParkingSpot.find();

  if (usuariosGenerales.length === 0 || plazas.length === 0) {
    log.warning('  ⚠ No hay usuarios o plazas para crear reservas');
    return [];
  }

  const reservas = [];
  const reservasPorCrear = 50; // Crear 50 reservas variadas

  // Generar fechas: desde hoy hasta 60 días adelante
  const fechas = generarFechas(reservasPorCrear, 0, 60);

  for (let i = 0; i < reservasPorCrear; i++) {
    const usuario = usuariosGenerales[Math.floor(Math.random() * usuariosGenerales.length)];
    const plaza = plazas[Math.floor(Math.random() * plazas.length)];
    const fecha = fechas[i];

    // 10% de probabilidad de que esté cancelada
    const status = Math.random() < 0.1 ? ReservationStatus.CANCELLED : ReservationStatus.ACTIVE;

    try {
      const reserva = await Reservation.create({
        parkingSpotId: plaza._id,
        userId: usuario._id,
        date: fecha,
        status,
      });

      reservas.push(reserva);
    } catch (error: any) {
      // Puede fallar por el índice único (plaza + fecha + status)
      // Ignoramos duplicados
      if (error.code !== 11000) {
        log.warning(`  ⚠ Error creando reserva: ${error.message}`);
      }
    }
  }

  // Contar por estado
  const activas = reservas.filter(r => r.status === ReservationStatus.ACTIVE).length;
  const canceladas = reservas.filter(r => r.status === ReservationStatus.CANCELLED).length;

  log.success(`${reservas.length} reservas creadas (${activas} activas, ${canceladas} canceladas)`);
  return reservas;
}

/**
 * Crea disponibilidades marcadas por usuarios de dirección
 */
async function crearDisponibilidades() {
  log.step('Creando disponibilidades...');

  const usuariosDireccion = await User.find({ role: UserRole.DIRECCION }).populate('assignedParkingSpot');
  const disponibilidades = [];

  for (const usuario of usuariosDireccion) {
    if (!usuario.assignedParkingSpot) continue;

    const plazaId = (usuario.assignedParkingSpot as any)._id;

    // Marcar algunos días como disponibles (próximos 30 días)
    const diasAMarcar = Math.floor(Math.random() * 10) + 5; // Entre 5 y 15 días
    const fechas = generarFechas(diasAMarcar, 0, 30);

    for (const fecha of fechas) {
      try {
        const disponibilidad = await Availability.create({
          parkingSpotId: plazaId,
          date: fecha,
          isAvailable: true,
          markedBy: usuario._id,
        });

        disponibilidades.push(disponibilidad);
      } catch (error: any) {
        // Puede fallar por el índice único (plaza + fecha)
        if (error.code !== 11000) {
          log.warning(`  ⚠ Error creando disponibilidad: ${error.message}`);
        }
      }
    }

    log.info(`  • ${usuario.name}: ${diasAMarcar} días marcados como disponibles`);
  }

  log.success(`${disponibilidades.length} disponibilidades creadas`);
  return disponibilidades;
}

/**
 * Muestra un resumen de los datos creados
 */
async function mostrarResumen() {
  console.log('');
  log.step('Resumen de datos creados:');
  console.log('');

  const totalUsers = await User.countDocuments();
  const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
  const direccionCount = await User.countDocuments({ role: UserRole.DIRECCION });
  const generalCount = await User.countDocuments({ role: UserRole.GENERAL });

  const totalPlazas = await ParkingSpot.countDocuments();
  const plazasSubterraneo = await ParkingSpot.countDocuments({ location: ParkingLocation.SUBTERRANEO });
  const plazasExterior = await ParkingSpot.countDocuments({ location: ParkingLocation.EXTERIOR });

  const totalReservas = await Reservation.countDocuments();
  const reservasActivas = await Reservation.countDocuments({ status: ReservationStatus.ACTIVE });
  const reservasCanceladas = await Reservation.countDocuments({ status: ReservationStatus.CANCELLED });

  const totalDisponibilidades = await Availability.countDocuments();

  console.log(`  ${colors.bright}Usuarios:${colors.reset}`);
  console.log(`    • Total: ${colors.cyan}${totalUsers}${colors.reset}`);
  console.log(`    • Administradores: ${colors.yellow}${adminCount}${colors.reset}`);
  console.log(`    • Dirección: ${colors.yellow}${direccionCount}${colors.reset}`);
  console.log(`    • Generales: ${colors.yellow}${generalCount}${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}Plazas de parking:${colors.reset}`);
  console.log(`    • Total: ${colors.cyan}${totalPlazas}${colors.reset}`);
  console.log(`    • Subterráneo: ${colors.yellow}${plazasSubterraneo}${colors.reset}`);
  console.log(`    • Exterior: ${colors.yellow}${plazasExterior}${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}Reservas:${colors.reset}`);
  console.log(`    • Total: ${colors.cyan}${totalReservas}${colors.reset}`);
  console.log(`    • Activas: ${colors.green}${reservasActivas}${colors.reset}`);
  console.log(`    • Canceladas: ${colors.red}${reservasCanceladas}${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}Disponibilidades:${colors.reset}`);
  console.log(`    • Total: ${colors.cyan}${totalDisponibilidades}${colors.reset}`);
  console.log('');

  console.log(`  ${colors.bright}Credenciales de acceso:${colors.reset}`);
  console.log(`    • Email: ${colors.cyan}[cualquier email creado]@gruposiete.es${colors.reset}`);
  console.log(`    • Password: ${colors.cyan}${DEFAULT_PASSWORD}${colors.reset}`);
  console.log('');
  console.log(`    Ejemplos:`);
  console.log(`      Admin:      ${colors.yellow}admin@gruposiete.es${colors.reset}`);
  console.log(`      Dirección:  ${colors.yellow}adrian@gruposiete.es${colors.reset}`);
  console.log(`      General:    ${colors.yellow}maria@gruposiete.es${colors.reset}`);
  console.log('');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('');
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}  SEED COMPLETO - GRUPO SIETE PARKING${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');

  try {
    // 1. Verificar entorno seguro
    verificarEntornoSeguro();
    console.log('');

    // 2. Solicitar confirmación
    const confirmado = await solicitarConfirmacion();

    if (!confirmado) {
      log.info('Operación cancelada por el usuario');
      process.exit(0);
    }

    console.log('');
    log.step('Iniciando seed...');
    console.log('');

    // 3. Conectar a MongoDB
    log.step('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    log.success('Conectado a MongoDB');
    console.log('');

    // 4. Limpiar base de datos
    log.step('Limpiando base de datos...');
    await User.deleteMany({});
    await ParkingSpot.deleteMany({});
    await Reservation.deleteMany({});
    await Availability.deleteMany({});
    log.success('Base de datos limpiada');
    console.log('');

    // 5. Crear datos
    await crearAdmin();
    console.log('');

    await crearUsuariosDireccion();
    console.log('');

    await crearUsuariosGenerales();
    console.log('');

    await crearPlazasParking();
    console.log('');

    await crearReservas();
    console.log('');

    await crearDisponibilidades();
    console.log('');

    // 6. Mostrar resumen
    await mostrarResumen();

    // 7. Finalizar
    log.success('Seed completado exitosamente');
    console.log('');
    console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log('');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.log('');
    log.error('Error durante el seed:');
    console.error(error);
    console.log('');

    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar
main();
