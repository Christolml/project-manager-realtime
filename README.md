# Project Manager Realtime

Aplicación web de gestión de proyectos tipo Kanban con colaboración en tiempo real. Permite crear proyectos, invitar miembros por correo electrónico, gestionar tareas con tablero Kanban, vista de lista y calendario, todo sincronizado en vivo mediante WebSockets.

---

## Tecnologías Usadas

### Backend (Go)

| Tecnología | Propósito |
|---|---|
| **Go 1.25** | Lenguaje de programación |
| **Chi v5** | Router HTTP ligero |
| **Huma v2** | Framework REST con generación automática de OpenAPI |
| **GORM v2** | ORM para PostgreSQL |
| **pgx v5** | Driver nativo de PostgreSQL |
| **gorilla/websocket** | WebSockets para tiempo real |
| **golang-jwt/jwt v5** | Autenticación mediante JSON Web Tokens |
| **golang.org/x/crypto** | Bcrypt para hash de contraseñas |
| **google/uuid** | Generación de UUIDs |

### Frontend (React + TypeScript)

| Tecnología | Propósito |
|---|---|
| **React 18** | Librería UI |
| **TypeScript 5.4** | Tipado estático |
| **React Router DOM 6** | Enrutamiento SPA |
| **Tailwind CSS v4** | Estilos utilitarios |
| **Vite 6** | Bundler y dev server |

### Base de Datos

| Tecnología | Propósito |
|---|---|
| **PostgreSQL** | Base de datos relacional |

---

## Arquitectura

```
Navegador (React SPA)
  │
  ├── React Router (Login, Register, Dashboard, ProjectDetail)
  ├── Layout (header + sidebar + <Outlet/>)
  ├── Sidebar (lista de proyectos, modal de nuevo proyecto)
  ├── ProjectDetail (vista principal)
  │   ├── ViewSwitcher (Kanban / Lista / Calendario)
  │   ├── StatusColumn (Kanban) / ListView / CalendarView
  │   ├── TaskCard (arrastrable)
  │   └── MemberPanel (invitar/eliminar miembros)
  ├── lib/api.ts (cliente REST)
  └── lib/ws.ts (cliente WebSocket)
       │
       │  HTTP REST (JSON)         WebSocket (tiempo real)
       ▼  /api/*                   /ws?token=...
Servidor Go (Chi + Huma + GORM)
  ├── config       ← configuración por variables de entorno
  ├── database     ← PostgreSQL + GORM AutoMigrate
  ├── models       ← 5 modelos (User, Project, ProjectMember, TaskStatus, Task)
  ├── auth + jwt   ← generación/validación de JWT
  ├── handlers     ← endpoints REST (auth, projects, tasks, members, statuses, websocket)
  └── websocket    ← Hub para broadcasting en tiempo real
       │
       ▼
   PostgreSQL
```

---

## Modelos de Datos

### User
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID (PK) | Identificador único |
| username | string (unique) | Nombre de usuario |
| email | string (unique) | Correo electrónico |
| password | string (hasheado) | Contraseña con bcrypt |
| createdAt | timestamp | Fecha de registro |
| updatedAt | timestamp | Última actualización |

### Project
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID (PK) | Identificador único |
| name | string | Nombre del proyecto |
| description | string | Descripción opcional |
| ownerId | UUID (FK → User) | Dueño del proyecto |
| createdAt | timestamp | Fecha de creación |
| updatedAt | timestamp | Última actualización |

### ProjectMember
| Campo | Tipo | Descripción |
|---|---|---|
| projectId | UUID (PK, FK → Project) | Proyecto |
| userId | UUID (PK, FK → User) | Usuario miembro |
| role | string | "admin" o "member" |

### TaskStatus
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID (PK) | Identificador único |
| projectId | UUID (FK → Project) | Proyecto al que pertenece |
| name | string | Nombre (ej. "To Do", "In Progress") |
| color | string | Color hexadecimal (ej. "#3b82f6") |
| status_order | int | Orden de visualización |
| createdAt | timestamp | Fecha de creación |

### Task
| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID (PK) | Identificador único |
| projectId | UUID (FK → Project) | Proyecto al que pertenece |
| title | string (200) | Título de la tarea |
| description | string (2000) | Descripción opcional |
| statusId | UUID (FK → TaskStatus) | Columna del Kanban |
| assignedTo | UUID? (FK → User) | Usuario asignado |
| dueDate | date? | Fecha de vencimiento |
| createdBy | UUID (FK → User) | Creador de la tarea |
| updatedBy | UUID? (FK → User) | Último usuario en modificar |
| createdAt | timestamp | Fecha de creación |
| updatedAt | timestamp | Última modificación |

Nota: El campo `dueDate` usa un tipo personalizado `DateOnly` que serializa a JSON como `"YYYY-MM-DD"` (sin zona horaria) para evitar problemas de desfase por huso horario.

---

## Autenticación

El sistema usa **JWT (JSON Web Tokens)** con algoritmo HS256.

**Flujo:**
1. El usuario se registra (`POST /api/auth/register`) o inicia sesión (`POST /api/auth/login`)
2. El servidor valida las credenciales y genera un token JWT con:
   - `userID` (UUID)
   - `username` (string)
   - Expiración: 72 horas
3. El frontend almacena el token en `localStorage`
4. Cada petición REST incluye el header `Authorization: Bearer <token>`
5. La conexión WebSocket usa `?token=<token>` como query parameter
6. El servidor valida el token en cada petición usando `resolveAuth()`

---

## WebSockets (Tiempo Real)

El servidor mantiene un **Hub** central que gestiona las conexiones WebSocket.

**Arquitectura:**
- Cada cliente se conecta a `/ws?token=<jwt>` y el servidor lo registra en el Hub
- El cliente envía mensajes `{"type": "subscribe", "projectId": "..."}` para suscribirse a un proyecto
- El Hub mantiene un mapa de `proyecto → [clientes]` para broadcasting eficiente
- También tiene un mapa de `usuario → [clientes]` para mensajes dirigidos (`SendToUser`)

**Eventos del WebSocket:**

| Tipo | Disparo | Destino | Data |
|---|---|---|---|
| `taskCreated` | Crear tarea | Proyecto | Task |
| `taskUpdated` | Editar/mover tarea | Proyecto | Task |
| `taskDeleted` | Eliminar tarea | Proyecto | `{id}` |
| `memberJoined` | Invitar miembro | Proyecto | Member |
| `memberRemoved` | Eliminar/abandonar | Proyecto | `{userId}` |
| `projectInvited` | Invitar miembro | Usuario invitado | `{projectId, projectName}` |

---

## API REST

Todas las rutas están bajo `/api/`. La documentación OpenAPI está disponible en `/docs` (proporcionado por Huma).

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |

### Projects
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/projects` | Listar proyectos del usuario |
| POST | `/api/projects` | Crear proyecto (con 3 columnas default) |
| GET | `/api/projects/{id}` | Obtener detalle del proyecto |
| PUT | `/api/projects/{id}` | Actualizar proyecto (solo owner) |
| DELETE | `/api/projects/{id}` | Eliminar proyecto (cascade) |

### Tasks
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/projects/{pid}/tasks` | Listar tareas |
| POST | `/api/projects/{pid}/tasks` | Crear tarea |
| PUT | `/api/projects/{pid}/tasks/{tid}` | Actualizar tarea |
| PATCH | `/api/projects/{pid}/tasks/{tid}/move` | Mover tarea a otro status |
| DELETE | `/api/projects/{pid}/tasks/{tid}` | Eliminar tarea |

### Statuses
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/projects/{pid}/statuses` | Crear columna de status |
| PUT | `/api/projects/{pid}/statuses/{sid}` | Renombrar/cambiar color |
| DELETE | `/api/projects/{pid}/statuses/{sid}` | Eliminar columna |

### Members
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/projects/{pid}/members` | Listar miembros |
| POST | `/api/projects/{pid}/members` | Invitar por email |
| DELETE | `/api/projects/{pid}/members/{uid}` | Eliminar miembro |
| POST | `/api/projects/{pid}/leave` | Abandonar proyecto |

---

## Funcionalidades Implementadas

### Gestión de Proyectos
- Crear proyecto con nombre y descripción
- Listar proyectos en el sidebar (con conteo de tareas)
- Editar nombre y descripción
- Eliminar proyecto (borra en cascada: tareas → status → miembros → proyecto)
- Abandonar proyecto (miembros pueden irse, el owner no)

### Columnas Kanban (TaskStatus)
- Crear columnas personalizadas por proyecto
- Renombrar con doble clic
- Cambiar color con selector de color
- Reordenar por campo `status_order`
- Eliminar columnas (con confirmación)

### Tareas
- Crear con título, descripción, status, fecha de vencimiento, asignado
- Editar todos los campos
- Eliminar con confirmación
- Arrastrar y soltar entre columnas Kanban (drag & drop nativo HTML5)
- Actualización optimista en drag & drop con rollback en error

### Fecha de Vencimiento
- Selector de fecha con validación (no permitir fechas pasadas)
- Alerta visual de tareas vencidas (⚠)
- Guardado como string `YYYY-MM-DD` sin zona horaria

### Información de Auditoría
- Cada tarea muestra `created by {usuario}` y `edited by {usuario}`
- El creador se asigna al crear la tarea
- El último editor se actualiza en cada modificación

### Tres Vistas
- **Kanban**: Tablero de columnas con drag & drop
- **Lista**: Tabla ordenable con todos los campos
- **Calendario**: Cuadrícula mensual con tareas agrupadas por fecha

### Miembros
- Invitar por correo electrónico (solo owner/admins)
- Listar miembros con roles (admin/member)
- Eliminar miembros (solo owner/admins)
- Abandonar proyecto (miembros)
- Notificaciones en tiempo real (entrada/salida de miembros)

### Sidebar Responsive
- Colapsable con botón ☰
- En móviles (<768px) se muestra como overlay con fondo semitransparente
- Modo iconos (collapsed) para pantallas pequeñas

---

## Cómo Ejecutar el Proyecto

### Requisitos Previos

- **Go** 1.25 o superior
- **Node.js** 20 o superior
- **PostgreSQL** 16 o superior
- Puerto **8080** libre (backend)
- Puerto **5173** libre (frontend)

### 1. Configurar la Base de Datos

Crear la base de datos en PostgreSQL:

```bash
createdb project_manager
```

O desde psql:

```sql
CREATE DATABASE project_manager;
```

### 2. Configurar Variables de Entorno (Opcional)

El proyecto usa valores por defecto que puedes sobrescribir:

```bash
# Backend (backend/)
export DATABASE_URL="host=localhost user=postgres password=postgres dbname=project_manager port=5432 sslmode=disable"
export JWT_SECRET="tu-secreto-super-seguro"
export PORT="8080"
```

Si tu PostgreSQL usa un usuario diferente (ej. `chris` sin contraseña):

```bash
export DATABASE_URL="host=localhost user=chris dbname=project_manager port=5432 sslmode=disable"
```

### 3. Iniciar el Backend

```bash
cd backend
go run ./cmd/server/
```

El servidor iniciará en `http://localhost:8080`. GORM ejecutará `AutoMigrate` automáticamente creando las tablas necesarias.

### 4. Iniciar el Frontend (en otra terminal)

```bash
cd frontend
npm install   # solo la primera vez
npm run dev
```

El frontend iniciará en `http://localhost:5173` con proxy automático al backend en `:8080`.

### 5. Detener los Servidores

```bash
kill $(lsof -t -i:8080 -sTCP:LISTEN) 2>/dev/null
kill $(lsof -t -i:5173 -sTCP:LISTEN) 2>/dev/null
```

---

## Estructura del Proyecto

```
project-manager-realtime/
├── backend/
│   ├── cmd/server/main.go          ← Punto de entrada
│   └── internal/
│       ├── auth/jwt.go             ← JWT generación/validación
│       ├── config/config.go        ← Configuración por env vars
│       ├── database/database.go    ← Conexión PostgreSQL + AutoMigrate
│       ├── handlers/
│       │   ├── auth.go             ← Registro e inicio de sesión
│       │   ├── members.go          ← CRUD miembros + WebSocket
│       │   ├── projects.go         ← CRUD proyectos
│       │   ├── statuses.go         ← CRUD columnas Kanban
│       │   ├── tasks.go            ← CRUD tareas + WebSocket
│       │   └── websocket.go        ← Upgrade WS + subscripciones
│       ├── middleware/auth.go      ← Middleware chi para JWT
│       ├── models/models.go        ← Modelos GORM + tipo DateOnly
│       └── websocket/hub.go        ← Hub de WebSockets
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CalendarView.tsx    ← Vista calendario mensual
│   │   │   ├── Layout.tsx          ← Layout responsive con sidebar
│   │   │   ├── ListView.tsx        ← Vista tabla de tareas
│   │   │   ├── MemberPanel.tsx     ← Panel de miembros
│   │   │   ├── Sidebar.tsx         ← Sidebar con lista de proyectos
│   │   │   ├── StatusColumn.tsx    ← Columna Kanban con drag & drop
│   │   │   ├── TaskCard.tsx        ← Tarjeta de tarea arrastrable
│   │   │   ├── Toast.tsx           ← Sistema de notificaciones
│   │   │   └── ViewSwitcher.tsx    ← Selector de vistas
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          ← Contexto de autenticación
│   │   │   ├── useDragAndDrop.ts   ← Hooks drag & drop nativos
│   │   │   ├── useToast.ts         ← Contexto de notificaciones
│   │   │   └── useWebSocket.ts     ← Hook de conexión WebSocket
│   │   ├── lib/
│   │   │   ├── api.ts              ← Cliente REST completo
│   │   │   └── ws.ts               ← Cliente WebSocket singleton
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       ← Página principal
│   │   │   ├── Login.tsx           ← Inicio de sesión
│   │   │   ├── ProjectDetail.tsx   ← Vista detalle del proyecto
│   │   │   └── Register.tsx        ← Registro de usuario
│   │   ├── types/index.ts          ← Interfaces TypeScript
│   │   ├── App.tsx                 ← Providers + rutas
│   │   ├── main.tsx                ← Punto de entrada React
│   │   └── index.css               ← Estilos globales + Tailwind
│   ├── index.html
│   ├── vite.config.ts              ← Proxy a backend + Tailwind
│   └── tsconfig.json
```

---

## Notas Técnicas

### Tipo DateOnly

Se creó un tipo personalizado `DateOnly` en Go que envuelve `time.Time` pero serializa a JSON como `"YYYY-MM-DD"` en lugar del formato RFC3339 estándar. Esto elimina todos los problemas de desfase por zona horaria al guardar y mostrar fechas. El tipo implementa las interfaces `driver.Valuer` (devuelve string) y `sql.Scanner` para compatibilidad con GORM.

### Drag & Drop Nativo

Se usa la API nativa HTML5 Drag and Drop, sin librerías externas. Los hooks `useDrag` y `useDrop` manejan los eventos `dragstart`, `dragover`, `drop`, etc. La actualización es optimista: se mueve la tarea inmediatamente en el estado local y se revierte si la petición HTTP falla.

### Proxy de Vite

El frontend en desarrollo usa el proxy de Vite para redirigir `/api/*` y `/ws` al backend en `localhost:8080`, evitando problemas de CORS.
