/*
 Script para generar iconos PWA (192x192, 512x512, mstile-150x150) desde una fuente existente.
 Requisitos: npm i jimp
 Uso: node scripts/generate-pwa-icons.js
*/

const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

(async function () {
  try {
    // Prefer a 32x32 favicon if available. Otherwise fallback to apple-icon.png or logo.png
    const argSource = process.argv[2];
    const candidateSources = [
      argSource && path.join(process.cwd(), argSource),
      path.join(__dirname, '..', 'public', 'favicon-32x32.png'),
      path.join(__dirname, '..', 'public', 'apple-icon.png'),
      path.join(__dirname, '..', 'public', 'logo.png'),
    ].filter(Boolean);

    let source = candidateSources.find((p) => fs.existsSync(p));
    if (!source) source = path.join(__dirname, '..', 'public', 'favicon-32x32.png');
    const out192 = path.join(__dirname, '..', 'public', 'favicon-192x192.png');
    const out512 = path.join(__dirname, '..', 'public', 'favicon-512x512.png');
    const out150 = path.join(__dirname, '..', 'public', 'mstile-150x150.png');

    const img = await Jimp.read(source);
    await img.clone().resize(192, 192).writeAsync(out192);
    await img.clone().resize(512, 512).writeAsync(out512);
    await img.clone().resize(150, 150).writeAsync(out150);

    console.log('Icons generated:', out192, out512, out150);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
})();
