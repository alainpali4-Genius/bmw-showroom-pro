# BMW Momentum Showroom — PRD

## Problem statement (original)
PWA profesional para un concesionario oficial BMW que centraliza la gestión de vehículos. Móvil como dispositivo principal, escritorio también. Diseño premium inspirado en BMW iDrive. Módulos: Dashboard, Stock, Plano de Exposición, Entregas, Mobiliario, Estadísticas, Configuración. Todo gira alrededor del STOCK y debe estar sincronizado entre módulos. Desarrollo por fases: primero base + Dashboard + Stock, luego esperar instrucciones.

## Arquitectura
- **Backend**: FastAPI modular (`server.py`, `db.py`, `auth.py`, `vehicles.py`, `vin_ocr.py`) + MongoDB (motor async). Todas las rutas con prefijo `/api`.
- **Frontend**: React 19 + React Router, TanStack Query, Tailwind + Shadcn UI. Estructura: `pages/`, `components/layout/`, `components/stock/`, `context/`, `lib/`.
- **Auth**: JWT en cookies httpOnly (access 12h + refresh 30d), bcrypt, seed admin idempotente.
- **Diseño**: paleta oficial BMW (azul #0066B1, M light/dark/red), fuentes Outfit + Manrope, shell responsive (sidebar escritorio / barra inferior móvil).

## Personas
- Product Genius, vendedores y responsable de exposición del concesionario.

## Core requirements (estáticos)
- Stock como eje central; sincronización entre módulos (ubicación Exposición→Plano, Entrega→Entregas).
- Plano de exposición tipo editor libre (bodas.net) con drag&drop de tarjetas de vehículo con silueta según carrocería y color BMW real.

## Implementado (2026-07-22) — Fase 1
- **Auth**: login email/contraseña, /me, /refresh, /logout. Admin: alainpali4@gmail.com.
- **Dashboard**: KPIs (total, exposición, stock, entregas), desglose por estado/categoría, últimos vehículos.
- **Stock**: CRUD completo, búsqueda, filtros (ubicación/estado/categoría), orden, import/export Excel (.xlsx) y CSV, plantilla de importación, escaneo de VIN por cámara (OCR gpt-4o vía Emergent LLM key con autocompletado).
- Catálogo de colores oficiales BMW; VIN corto auto (últimos 7).
- Verificado: 16/16 tests backend + E2E frontend 100%.

## Implementado (2026-07-22) — Fase 2 — Plano de Exposición
- Editor libre estilo bodas.net (sin cuadrícula fija): crear, eliminar, duplicar, mover, redimensionar y rotar plazas.
- Zoom (rueda + botones) y pan; guardado automático (PUT /plano/save autoritativo); undo/redo; alinear.
- Modo edición vs modo normal (en normal solo se mueven vehículos; plazas protegidas).
- Drag & drop de vehículos entre plazas y desde bandeja "Sin plaza"; al soltar se actualiza plaza_id, plaza y ubicación (zona→ubicación) en BD.
- Tarjetas premium con silueta superior por carrocería (SUV, Berlina, Touring, Coupé, Gran Coupé, Compact, Cabrio, Roadster, Eléctrico) pintada con el color oficial BMW; muestran modelo, motor, VIN corto, plaza, color y estado. Plaza vacía = solo contorno + nombre. Click abre ficha completa.
- Sincronización en tiempo real vía WebSocket (/api/ws/plano) con fallback de polling 20s.
- Agrupación por zonas (Exposición, Stock Exposición, Taller, Terraza, Entreplanta, Entregas) con color de acento.
- Verificado: 18/18 tests backend Plano + E2E frontend 100%.

## Backlog priorizado (pendiente — esperar instrucciones del usuario)
- **P0 — Plano de Exposición**: editor libre (plazas ilimitadas, mover/redimensionar/rotar, zonas, zoom/pan, autosave), tarjetas premium con silueta por carrocería pintada con color BMW, drag&drop de vehículos entre plazas con actualización de ubicación.
- **P1 — Entregas**: vista automática de vehículos con ubicación "Entrega" y gestión del proceso.
- **P1 — Estadísticas**: gráficas avanzadas.
- **P2 — Mobiliario**: inventario de mobiliario de exposición.
- **P2 — Configuración**: gestión de usuarios, zonas del plano, preferencias.
- **P2 — PWA offline**: service worker + iconos + instalación.

## Next tasks
Esperar instrucciones del usuario para iniciar el módulo **Plano de Exposición** (siguiente fase).
