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

## 🏗️ Technical Architecture

### Request Flow Diagram

El siguiente diagrama muestra el flujo completo de una petición de reserva a través de las diferentes capas del sistema:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Client<br/>(React)
    participant MW as Next.js<br/>Middleware
    participant API as API Route<br/>/api/reservations
    participant RL as Rate Limiter<br/>(Memory/Redis)
    participant ZOD as Zod<br/>Validation
    participant MDB as MongoDB<br/>(Transactions)

    User->>UI: Click "Reservar Plaza"
    UI->>MW: POST /api/reservations<br/>{parkingSpotId, date}

    Note over MW: Auth Check
    MW->>MW: Verify session cookie<br/>(authjs.session-token)

    alt No session cookie
        MW-->>UI: 302 Redirect /login
    else Has session cookie
        MW->>API: Forward request
    end

    Note over API: Session Validation
    API->>API: auth() - Verify JWT

    alt Invalid session
        API-->>UI: 401 Unauthorized
    else Valid session
        API->>API: Check user role
    end

    alt Role != GENERAL
        API-->>UI: 403 Forbidden
    end

    Note over RL: Rate Limiting
    API->>RL: checkRateLimit()<br/>10 req / 5 min

    alt Limit exceeded
        RL-->>API: {success: false}
        API-->>UI: 429 Too Many Requests<br/>+ Retry-After header
    else Within limit
        RL-->>API: {success: true, remaining}
    end

    Note over ZOD: Input Validation
    API->>ZOD: CreateReservationSchema<br/>.safeParse(body)

    alt Validation failed
        ZOD-->>API: {success: false, errors}
        API-->>UI: 400 Bad Request<br/>{error, details[]}
    else Validation passed
        ZOD-->>API: {success: true, data}
    end

    Note over API: Business Rules
    API->>API: Validate date:<br/>- Not weekend<br/>- Not past<br/>- Max 60 days ahead

    alt Invalid date rules
        API-->>UI: 400 Bad Request
    end

    Note over MDB: Database Transaction
    API->>MDB: startSession()<br/>startTransaction()

    MDB->>MDB: Check: User already<br/>has reservation for date?

    alt Already reserved
        MDB-->>API: Abort transaction
        API-->>UI: 400 "Ya tienes reserva"
    end

    MDB->>MDB: Check: Availability<br/>exists for parkingSpot?

    alt Not available
        MDB-->>API: Abort transaction
        API-->>UI: 400 "Plaza no disponible"
    end

    MDB->>MDB: Check: Spot already<br/>reserved by other user?

    alt Already taken
        MDB-->>API: Abort transaction
        API-->>UI: 400 "Plaza ya reservada"
    end

    MDB->>MDB: Reservation.create()
    MDB->>MDB: commitTransaction()
    MDB-->>API: Reservation document

    API->>MDB: populate(parkingSpot, user)
    MDB-->>API: Populated reservation

    API-->>UI: 200 OK<br/>{success: true, reservation}
    UI-->>User: "¡Reserva confirmada!"
```

### Capas del Sistema

| Capa               | Tecnología             | Responsabilidad                                        |
| ------------------ | ---------------------- | ------------------------------------------------------ |
| **Middleware**     | Next.js Edge           | Verificación de cookies de sesión, redirección a login |
| **Auth**           | NextAuth v5            | Validación JWT, gestión de sesiones seguras            |
| **Rate Limiting**  | Memory / Upstash Redis | Prevención de abusos (10 reservas/5min por usuario)    |
| **Validation**     | Zod                    | Validación estricta de tipos y formatos antes de DB    |
| **Business Logic** | TypeScript             | Reglas de negocio (días laborables, fechas válidas)    |
| **Persistence**    | MongoDB + Mongoose     | Transacciones ACID para prevenir race conditions       |

### Stack Tecnológico

| Categoría     | Tecnología                         |
| ------------- | ---------------------------------- |
| Framework     | Next.js 14 (App Router)            |
| Lenguaje      | TypeScript (strict mode)           |
| Base de Datos | MongoDB Atlas + Mongoose ODM       |
| Autenticación | NextAuth v5 (beta)                 |
| Validación    | Zod                                |
| Rate Limiting | Upstash Redis / In-memory fallback |
| Estilos       | Tailwind CSS v4                    |
| Componentes   | Radix UI Primitives                |
| Animaciones   | Framer Motion                      |
| Email         | Resend                             |
| Testing       | Vitest                             |

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
