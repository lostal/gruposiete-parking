#!/usr/bin/env node

/**
 * Script para generar NEXTAUTH_SECRET para producción
 *
 * Uso:
 *   node scripts/generate-secret.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generando NEXTAUTH_SECRET para producción...\n');

const secret = crypto.randomBytes(32).toString('base64');

console.log('═══════════════════════════════════════════════════════════');
console.log('Tu NEXTAUTH_SECRET (cópialo para Vercel):');
console.log('═══════════════════════════════════════════════════════════');
console.log(secret);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('⚠️  IMPORTANTE:');
console.log('   - Guarda este secreto en un lugar seguro');
console.log('   - NO lo compartas públicamente');
console.log('   - Úsalo SOLO para producción (diferente al de desarrollo)');
console.log('   - Añádelo como variable de entorno NEXTAUTH_SECRET en Vercel\n');
