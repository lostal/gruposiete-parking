# 🅖 Gruposiete Parking

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

</div>

Sistema de reservas para plazas de parking interne y externas. UI con Next.js, TypeScript y Tailwind. Backend ligero con MongoDB y autenticación mediante NextAuth.

---

## ✨ Características

- Interfaz de administración y vista de usuario.
- Gestión de plazas: listar, reservar (FIFO) y ver historial.
- Roles: Admin y Usuario.
- Seed para datos de desarrollo.
- Emails (simulados o reales con `RESEND_API_KEY`).

---

## 🛠 Requisitos

- Node.js 20+ recomendado
- npm o pnpm
- MongoDB (Atlas o local)

---

## ⚡ Rápido — Instalación y uso

1. Clona el repo (ya estás en el código local).
2. Instala dependencias:

```powershell
npm install
```

3. Crea un archivo de entorno local copiando el ejemplo:

```powershell
cp .env.example .env.local
# o en PowerShell
Copy-Item .env.example .env.local
```

Rellena `MONGODB_URI`, `NEXTAUTH_SECRET` y/o `RESEND_API_KEY` si necesitas envío real de emails.

4. Ejecuta en desarrollo:

```powershell
npm run dev
```

5. (Opcional) Popular datos de desarrollo:

```powershell
npm run seed
```

Nota: la contraseña admin del seed se toma desde `SEED_ADMIN_PASSWORD` o se genera aleatoriamente; se muestra en la salida del seed solo cuando corres el script localmente.

---

## 🔐 Variables de entorno (mínimas)

- `MONGODB_URI` — cadena de conexión a MongoDB
- `NEXTAUTH_SECRET` — secreto para NextAuth (genera con `openssl rand -base64 32`)
- `RESEND_API_KEY` — (opcional) para envío real de emails vía Resend
- `SEED_ADMIN_PASSWORD` — (opcional) contraseña para el seed

No subas tus archivos `.env*` al repositorio. `.gitignore` ya cubre `.env*` y `.env.local`.

---

## Estructura del proyecto

```
├── app/               # Rutas y páginas (Next 14, app router)
├── components/        # Componentes UI
├── lib/               # DB, auth y utilidades
├── models/            # Mongoose models
├── scripts/           # Scripts (seed)
├── public/            # Assets estáticos
├── README.md
├── package.json
```

---

## Buenas prácticas antes del commit

- Asegúrate de NO incluir archivos generados: `node_modules/`, `.next/`, `out/`.
- Comprueba `git status` y que `.gitignore` está presente.
- Si en algún momento `.next` fue añadido al índice, remuévelo con:

```powershell
git rm -r --cached .next
git commit -m "chore: remove build artifact from index"
```

---

## Autor

---

## PWA (Progressive Web App)

 Se añadieron los archivos y la configuración base para que la aplicación pueda funcionar como PWA y tener un modo offline básico:

 - `public/site.webmanifest` — Manifest del PWA
 - `public/sw.js` — Service worker con cache básico (instalación/activación/fetch)
 - `public/offline.html` — Página fallback cuando no hay conexión
<!-- Minimal PWA: browserconfig/ms-tile files removed intentionally. -->
 - `components/pwa/RegisterServiceWorker.tsx` — Componente cliente que registra el SW automáticamente

 Notas de implementación y mejoras propuestas:

 - Las imágenes 192x192 y 512x512 se generaron (placeholder) desde el favicon original 32x32 por simplicidad. Si consigues un origen de mayor resolución o SVG, es recomendable generar iconos a partir de ese archivo para mejor calidad.
 - El `service worker` es básico y pensado como primer paso: si necesitas reglas de cacheo más avanzadas, usar un plugin como `next-pwa` o `workbox` te proporcionará estrategias más robustas y adaptadas a recursos dinámicos.
 - El middleware fue actualizado para permitir el acceso a `site.webmanifest`, `sw.js`, y otros archivos estáticos sin ser redirigidos por la política de autenticación.

Cómo probar localmente:

```powershell
npm run dev
# Visitar: http://localhost:3000
```

La instalación del PWA (Add to Home Screen) está condicionada a los navegadores y al uso en producción (o con https). Para probar la instalación localmente, usa `https` y la pestaña "Application" en DevTools para ver el manifest y el service worker.

**Álvaro Lostal** — _Ingeniero Informático | Frontend Developer_

[🌐 lostal.dev](https://lostal.dev) — [GitHub](https://github.com/lostal)
