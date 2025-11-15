#!/usr/bin/env node

/**
 * Script para generar hash de password para crear usuario admin manualmente
 *
 * Uso:
 *   node scripts/hash-password.js "TuPasswordAqui"
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('\n❌ Error: Debes proporcionar una contraseña\n');
  console.log('Uso:');
  console.log('  node scripts/hash-password.js "TuPasswordAqui"\n');
  console.log('Ejemplo:');
  console.log('  node scripts/hash-password.js "MiPasswordSegura123!"\n');
  process.exit(1);
}

console.log('\n🔐 Generando hash de password...\n');

const hash = bcrypt.hashSync(password, 10);

console.log('═══════════════════════════════════════════════════════════');
console.log('Password hash (para MongoDB):');
console.log('═══════════════════════════════════════════════════════════');
console.log(hash);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('ℹ️  Usa este hash para crear el usuario admin en MongoDB Atlas');
console.log('   Ver DEPLOY_VERCEL.md - Paso 5 para instrucciones completas\n');
