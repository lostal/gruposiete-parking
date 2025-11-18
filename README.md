# 🅖 Gruposiete Parking

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

</div>

## 📋 Descripción

Sistema de **reservas inteligente** para plazas de parking (subterráneas y exteriores) de Grupo Siete. Permite a los empleados gestionar sus reservas de manera eficiente, con un control administrativo basado en roles y validaciones robustas que garantizan la disponibilidad y el uso óptimo de los espacios.

Desarrollado con **Next.js 14**, **TypeScript** y **MongoDB**, implementa autenticación segura mediante **NextAuth**, rate limiting distribuido y un sistema de transacciones que previene conflictos en reservas concurrentes.

---

## ⚡ Características Principales

- **Autenticación Segura**: Sistema de login con validación de emails corporativos, protección contra timing attacks y recuperación de contraseña
- **Rate Limiting Distribuido**: Implementación con Upstash Redis para prevenir abusos (5 registros/15min, 10 reservas/5min)
- **Transacciones MongoDB**: Previene race conditions en reservas concurrentes mediante reintentos exponenciales
- **UI Moderna y Responsiva**: Diseño con Tailwind CSS, componentes Radix UI y animaciones Framer Motion
- **Sistema de Roles**: Tres niveles de acceso (GENERAL, DIRECCION, ADMIN) con dashboards diferenciados
- **Notificaciones Email**: Envío automático de confirmaciones mediante Resend
- **Aplicación PWA**: Mejoras en rendimiento y experiencia de usuario

---

## 🚀 Funcionalidades

### 👤 Usuario General

- Reservar y cancelar plazas disponibles (L-V, hasta 60 días de anticipación)
- Máximo una reserva activa por día
- Visualizar historial de reservas
- Gestionar perfil y cambiar contraseña

### 🏢 Dirección

- Gestionar disponibilidad de su plaza asignada (marcar días como libre/ocupado)
- Visualizar estado de reservas de su plaza
- Dashboard con calendario de disponibilidad

### 🔧 Administrador

- Visualizar todos los usuarios y plazas del sistema
- Asignar/desasignar plazas permanentes a usuarios Dirección
- Ver estadísticas y métricas globales
- Monitorear últimas reservas del sistema

---

<div align="center">

**Álvaro Lostal**
_Ingeniero Informático | Frontend Developer_

[![Portafolio](https://img.shields.io/badge/Portafolio-lostal.dev-d5bd37?style=for-the-badge&logo=astro&logoColor=white)](https://lostal.dev)
[![GitHub](https://img.shields.io/badge/GitHub-lostal-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/lostal)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Álvaro%20Lostal-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/alvarolostal)

</div>

---

<div align="center">

⭐ **¿Te gusta este proyecto?** ¡Dale una estrella para apoyar mi trabajo!

</div>
