# Recibos — código (Fase 0-5)

Adaptador de recibos de sueldo argentinos (Ley 27.802 / Decreto 407/2026). Este directorio contiene **únicamente código**: es la futura raíz del repositorio Git. La estrategia de producto, las decisiones de arquitectura y la constitución técnica viven fuera de este directorio (no se suben al repositorio).

## Descripción

Monorepo con dos paquetes independientes:

- `backend/` — API NestJS (TypeScript), Modular Monolith + Clean Architecture. Ver estructura de módulos abajo.
- `frontend/` — SPA React + Vite (TypeScript).
- `docker-compose.yml` — orquesta PostgreSQL + backend + frontend para desarrollo/despliegue.

## Instalación

Requisitos: Node.js 22+, npm, Docker + Docker Compose (para levantar Postgres) o una instancia de PostgreSQL propia.

```bash
# Backend
cd backend
npm install
cp .env.example .env   # completar JWT_SECRET y DATABASE_URL

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

## Variables de entorno

**`backend/.env`** (ver `backend/.env.example`):

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | Puerto HTTP del backend (default 3000) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar JWT (mínimo 16 caracteres, generar con `openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | Expiración del token (default `8h`) |
| `ADMIN_REGISTRATION_TOKEN` | Requerido para crear cuentas (`POST /auth/register`, header `X-Admin-Registration-Token`) — el registro está cerrado al público, ver "Seguridad" más abajo |

**`frontend/.env`** (ver `frontend/.env.example`):

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API backend (default `http://localhost:3000/api`) |

**`app/.env`** (raíz, ver `.env.example`): usado por `docker-compose.yml`.

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Igual que en `backend/.env` |
| `POSTGRES_PASSWORD` | Password de Postgres dentro del compose (generar con `openssl rand -base64 24`; nunca el `recibos`/`recibos` de desarrollo) |
| `DOMINIO` | Dominio público que apunta a este servidor (ej. `turecibos.duckdns.org`) — Caddy lo usa para emitir el certificado HTTPS automáticamente |

## Cómo ejecutar

### Desarrollo local (sin Docker)

Requiere una instancia de PostgreSQL accesible. Si no tenés Docker ni Postgres instalado, el repo trae una alternativa: `embedded-postgres` (devDependency), un binario real de PostgreSQL que corre sin instalación de sistema.

```bash
# Terminal 1: Postgres local (persiste los datos en backend/.dev-db-data/, gitignored)
cd backend
npm run db:dev

# Terminal 2: backend
cd backend
npx prisma migrate deploy   # primera vez, o después de bajar migraciones nuevas
npm run start:dev

# Terminal 3: frontend
cd frontend
npm run dev
```

Si ya tenés tu propia instancia de PostgreSQL, salteá `npm run db:dev` y apuntá `DATABASE_URL` en `backend/.env` a la tuya. Esta aplicación maneja texto en español (tildes, ñ) — asegurate de que tu base esté creada con **encoding UTF8** (`npm run db:dev` ya lo fuerza; si usás tu propia instancia, verificalo con `SHOW server_encoding;`).

### Con Docker Compose

Levanta 4 servicios: `postgres` (interno, sin puerto publicado), `backend` (interno), `frontend` (nginx, interno — sirve el SPA y proxea `/api` hacia `backend`) y `caddy` (único servicio con puertos publicados, `80`/`443` — HTTPS automático vía Let's Encrypt).

```bash
cp .env.example .env   # completar JWT_SECRET, POSTGRES_PASSWORD y DOMINIO
docker compose up --build
```

**Antes del primer `up`**, `DOMINIO` (en `.env`) tiene que resolver por DNS a la IP pública de este servidor, y los puertos `80`/`443` tienen que estar abiertos hacia afuera — si no, Caddy no puede completar el desafío ACME y no emite el certificado. Con eso resuelto, la app queda disponible en `https://<DOMINIO>` sin ningún paso manual de TLS.

**Para probar el stack completo en una máquina local, sin dominio real:** poné `DOMINIO=localhost` en `.env` — Caddy detecta que no es un dominio público y sirve un certificado autofirmado en `https://localhost` en vez de pedirle uno a Let's Encrypt (el navegador va a advertir que no confía en el certificado, es esperable).

El comando de arranque del backend (`docker-compose.yml`) corre `prisma migrate deploy` antes de levantar el servidor, así que las tablas quedan creadas automáticamente a partir de `backend/prisma/migrations/`.

> **Docker sí se probó de punta a punta contra el stack real** (ADR-067, 2026-07-19): `docker compose up --build` levantando los 3 servicios de entonces (`postgres`/`backend`/`frontend`) y un flujo completo real por HTTP — registro → login → alta de empresa → importar Excel → mapear concepto → confirmar → emitir recibo → descargar PDF — funcionó de punta a punta, incluida la persistencia del volumen `backend_uploads` ante un reinicio del contenedor. La topología cambió después (Tarea 4 del plan de piloto, 2026-07-22): se agregó `caddy` como entrada pública con HTTPS, se sacaron los puertos publicados de `postgres`/`backend`/`frontend` (ya no hace falta que estén expuestos al host), `VITE_API_URL` pasó a ser relativo (`/api`, vía `frontend/.env.production`, ver nginx.conf) en vez de depender de que backend y frontend compartan `localhost`, y la password de Postgres pasó a venir de `POSTGRES_PASSWORD` en vez de estar hardcodeada. Estos cambios no se volvieron a correr contra un `docker compose up --build` real en esta sesión (sin Docker Desktop disponible en este entorno) — si algo no levanta, es acá donde hay que mirar primero.

### Cuando cambies el schema de Prisma

```bash
cd backend
npm run prisma:migrate   # genera y aplica una nueva migración a partir de cambios en schema.prisma
```

## Estructura

```
app/
  backend/
    src/
      modules/        (auth, empresas, empleados, importacion, catalogo-conceptos, validacion, emision — cada uno: domain/application/infrastructure/presentation)
      shared/          (value objects: Cuit, Cuil, Money; errores de dominio; pipes; decorators)
      infra/           (config, db, auditoría transversal, logging, health, manejo de errores)
    prisma/schema.prisma
    test/
  frontend/
    src/
      api/             (cliente HTTP)
      pages/
  docker-compose.yml
```

## Empresas

`POST/GET /api/empresas` — alta y listado, siempre acotado al usuario autenticado. `PATCH /api/empresas/:id` — edición (razón social, CUIT, nombre de fantasía, domicilio, localidad, provincia, código postal; todos opcionales, al menos uno requerido).

## Importación de archivos (Fase 1)

El núcleo ingesta datos ya liquidados vía un **único formato oficial**: el **Excel Oficial de Importación v1** (`.xlsx`, especificado completo en `docs/contrato-excel-oficial-importacion.md`, fuera de este repo). Cualquier integración con un sistema de liquidación externo (Tango, Bejerman, SAP, Calipso) se resuelve mediante un **conector externo** — módulo independiente en `conectores/`, no parte del núcleo — que traduce el formato de origen a este Excel oficial (ver `DECISIONS.md`, ADR-054). Formato largo: una fila = un empleado + un concepto.

Columnas obligatorias (por nombre de encabezado, no por posición — el orden es libre). Ilustradas acá como texto plano por legibilidad, pero el archivo real es un `.xlsx`:

```
cuil,nombre,apellido,concepto,monto
27309876542,Juan,Perez,Sueldo básico,150000
27309876542,Juan,Perez,Antigüedad,15000
```

Columnas opcionales: `unidad` y `base` — auditoría de cálculo (ej. `unidad=11%`, `base=850000`), tal cual vienen del archivo de origen. Son puramente informativas: nunca se validan contra `monto` (el adaptador no liquida sueldos) y, si faltan, la fila sigue siendo válida. El recibo las muestra en la tabla de conceptos solo si al menos una fila las trae.

Flujo (dos pasos, nunca se crea nada hasta confirmar):

1. `POST /api/empresas/:empresaId/importaciones` — multipart/form-data con campos `anio`, `mes` y el archivo en el campo `archivo`. Devuelve la previsualización: fila por fila, cuáles son válidas y cuáles tienen error (y por qué).
2. `POST /api/empresas/:empresaId/importaciones/:id/confirmar` — si hay aunque sea una fila con error, rechaza (400): hay que corregirla (por archivo, volviendo a importar, o fila por fila sin re-subir nada — ver "Robustez de conectores" más abajo). Si todas son válidas, crea (o matchea por CUIL) los Empleados y marca la importación como `confirmada`.

`GET /api/empresas/:empresaId/importaciones/:id` releé una previsualización ya guardada.

## Catálogo de conceptos (Fase 2)

Cada concepto del archivo (`Sueldo básico`, `ART`, etc.) se clasifica según el Anexo III: `tipo` (`remunerativo | no_remunerativo | deduccion | contribucion_patronal`) y una `categoriaContribucion` (`sindical | seguridad_social | obra_social | inssjp | art | camaras_empresariales | otros`) — obligatoria si `tipo` es `contribucion_patronal`, opcional si es `deduccion` (permite cruzar, en el recibo, cuánto puso el empleador y cuánto se le retuvo al trabajador de la misma categoría; no toda deducción encaja en una, ej. un adelanto de sueldo).

La clasificación se define **una sola vez por empresa** y se reutiliza:

- `POST /api/empresas/:empresaId/conceptos` — body `{ concepto, tipo, categoriaContribucion? }`. Se aplica de inmediato a todas las filas sin clasificar de ese concepto en **toda la empresa** (no solo la importación que tenías abierta).
- `GET /api/empresas/:empresaId/conceptos` — lista el catálogo ya clasificado.
- `GET /api/empresas/:empresaId/conceptos/sin-clasificar` — lista lo pendiente.

Al **confirmar** una importación (Fase 1), el sistema clasifica solo los conceptos que ya están en el catálogo de la empresa; los que nunca vio quedan sin clasificar y visibles como pendientes, sin bloquear la confirmación (eso es responsabilidad de la fase de Validación).

## Validación (Fase 3)

`GET /api/empresas/:empresaId/importaciones/:id/validacion` — de solo lectura, se recalcula en cada pedido (no persiste nada). Por cada empleado de la importación calcula `totalBruto`, `totalDeducciones`, `totalContribucionesPatronales`, `neto` y `costoLaboralTotal` (las filas sin clasificar no suman, se reportan aparte).

**Bloquea** (`puedeEmitirse: false`): hay conceptos sin clasificar en la importación · un empleado no tiene ningún concepto remunerativo · el neto de un empleado da negativo.

**Advierte, sin bloquear:** el neto de un empleado varió más de ~30% respecto de su importación *confirmada* comparable más reciente (la primera hacia atrás donde ese empleado esté 100% clasificado).

## Emisión (Fase 4)

Antes de emitir, hacen falta dos datos que no vienen del archivo:

- `PATCH /api/empresas/:empresaId/empleados/:id` — body `{ categoria?, fechaIngreso?, legajo? }`. Ficha del empleado, se carga una vez y se reutiliza en cada recibo (antigüedad se calcula sola).
- `PATCH /api/empresas/:empresaId/empleados/:id/estado` — body `{ estado: 'activo'|'inactivo' }`. "Baja" de un empleado: nunca se borra (los recibos ya emitidos referencian `empleadoId` para siempre), solo se marca inactivo — reversible con el mismo endpoint.
- `PATCH /api/empresas/:empresaId/importaciones/:id/datos-emision` — body `{ fechaPago?, lugarPago?, fechaPagoCargasSociales?, lugarPagoCargasSociales? }`. Se puede completar de a un campo; la importación expone `datosEmisionCompletos` cuando los 4 están cargados.

Con la importación `confirmada`, datos de emisión completos y `GET .../validacion` en `puedeEmitirse: true`:

- `POST /api/empresas/:empresaId/importaciones/:id/recibos/emitir` — emite en **lote** el recibo de todos los empleados de la importación (no existe emisión individual). Por cada uno genera un PDF conforme al Anexo III (4 secciones + gráfico de torta de la composición del costo laboral + detalle Empleador/Trabajador por categoría) con Puppeteer, calcula su hash SHA-256 y lo persiste como documento inmutable (snapshot autocontenido — un cambio posterior en Empresa/Empleado nunca afecta un recibo ya emitido). Rechaza (400) si: la importación no está confirmada, faltan datos de emisión, ya existen recibos emitidos para esa importación, o la validación tiene errores pendientes.
- `GET .../recibos` — lista metadata de los recibos vigentes de esa importación (`?incluirAnulados=true` para ver también los anulados).
- `GET .../recibos/:reciboId/descargar` — descarga el PDF, con nombre de archivo `Recibo - Apellido Nombre - Período.pdf` (ver más abajo).

**Diseño del PDF:** layout fluido (sin coordenadas fijas), inspirado en una plantilla oficial de referencia, con apariencia institucional y sobria (sin estética de dashboard). Cada recibo entra **siempre en una única hoja A4**, sin excepciones: si el contenido no entra a tamaño normal, se aplica automáticamente un factor de escala uniforme (fuente, filas, separaciones y gráfico se achican juntos, proporcionalmente) con un piso mínimo de legibilidad. Ninguna sección ni campo sin datos reserva espacio en el documento. Las tablas de detalle tienen grilla completa (líneas verticales y horizontales, mismo ancho de columna en las tres tablas del recibo) y sus columnas numéricas (Unidad/Base/Monto) van centradas; los encabezados de sección nunca llevan una numeración antepuesta; subtotales y totales se destacan con una barra de fondo, y "Costo laboral total" tiene la mayor jerarquía visual de su sección, como en el modelo oficial. Ver DECISIONS.md, ADR-047 a 051.

## Repositorio técnico (Fase 5): anulación, reemisión, historial, descarga por lote

Un recibo emitido nunca se edita — se corrige en dos pasos:

- `POST .../recibos/:reciboId/anular` — body `{ motivo }` (obligatorio). Solo sobre un recibo vigente.
- `POST .../recibos/:reciboId/reemitir` — solo sobre un recibo ya anulado que todavía no tenga reemplazo. Genera un recibo nuevo y vigente con los datos **actuales** de Empresa/Empleado (así la corrección tiene efecto real), vuelve a validar antes de generarlo, y lo enlaza al anulado (`reemplazaAId`). Rechaza (400) si el recibo está vigente, si ya fue reemitido, o si la validación actual no pasa.

Historial y descarga:

- `GET /api/empresas/:empresaId/recibos` — historial completo de la empresa, cruzando todas sus importaciones (vigentes y anulados, para ver la cadena de reemplazos). Filtro opcional `?empleadoId=`.
- `GET /api/empresas/:empresaId/importaciones/:id/recibos/descargar-lote` — ZIP con los PDF vigentes de esa importación.
- `GET /api/empresas/:empresaId/importaciones/:id/recibos/:reciboId/auditoria` — historial cronológico de acciones (emitir/anular/reemitir) de un recibo puntual, leído del `AuditLog` transversal.

**Nomenclatura de archivo:** todo PDF de recibo, se descargue individualmente o dentro del ZIP de lote, se nombra siempre `Recibo - Apellido Nombre - Período.pdf` (ej. `Recibo - Pérez Juan - Junio 2026.pdf`) — mismo criterio en cualquier punto del sistema. Si dos empleados vigentes del mismo lote comparten apellido y nombre, la entrada del ZIP en colisión suma un sufijo `(2)`, `(3)`... para que ningún recibo se pierda al extraer.

La plataforma actúa como **repositorio técnico** (versiones, historial, trazabilidad), **no** como archivo legal oficial del empleador (ver `DECISIONS.md`, ADR-018). El registro (`POST /api/auth/register`) exige aceptar los Términos y Condiciones y el Acuerdo de Tratamiento de Datos (`docs/legal/`, fuera de este repositorio — **borrador sin validez legal**, pendiente de revisión profesional).

## Robustez de conectores (Fase 6)

> ⚠️ Nota (ADR-054): esta fase agregó originalmente un segundo conector (CSV + Excel, elegido por extensión). El núcleo hoy acepta un único formato oficial — **Excel Oficial de Importación v1** (ver "Importación de archivos" más arriba y `docs/contrato-excel-oficial-importacion.md`) — el conector CSV se retiró del núcleo y se reubicó como conector externo de ejemplo en `conectores/csv-legado/`. La tolerancia descripta abajo sigue vigente tal cual, ahora en el único conector que queda.

**Tolerante por diseño**: encabezados en cualquier mayúscula/minúscula o con espacios de más, columnas en cualquier orden, filas completamente vacías (se saltean, preservando el número de fila real del archivo para cualquier error posterior). Además, ciertas correcciones de **formato** se aplican solas sin bloquear la fila — nunca de contenido (nunca capitalización, nunca reinterpretación) — e informan qué se corrigió:

- CUIL con guiones/puntos/espacios → se limpia a solo dígitos.
- Monto con coma decimal (`1500,50`) → se interpreta como separador decimal.
- Nombre/apellido/concepto con espacios de más → se recortan.
- CUIL, nombre y apellido los 3 vacíos juntos → se heredan de la última fila que sí los traía completos (ADR-072, opción B) — evita repetirlos en cada concepto de un mismo empleado. Si falta solo alguno de los 3, no se hereda nada: sigue siendo un dato faltante real.

La respuesta de la importación (`GET`/`POST` de más arriba) incluye `correcciones` por fila y `filasConCorrecciones` en el resumen — mismo cálculo al vuelo que `filasValidas`/`filasConError`, sin persistencia extra. Desde ADR-072, este campo también recibe observaciones del propio adaptador (como la herencia) — nunca viajan dentro del contrato `FilaCanonica`, que sigue siendo agnóstico del origen.

**Corregir una fila sin re-subir el archivo:**

- `PATCH /api/empresas/:empresaId/importaciones/:id/filas/:filaId` — body con cualquier subconjunto de `{ cuil, nombre, apellido, concepto, monto, unidad, base }` (al menos uno). Solo mientras la importación está `previsualizada`. Revalida únicamente esa fila (misma regla de negocio que al importar) y deja el resto de la importación intacto.

## Frontend

SPA en construcción, en 7 sub-fases (una capacidad de usuario completa por fase, no un espejo mecánico de las fases del backend). Stack: React Router, TanStack Query, Mantine (`core`/`form`/`notifications`/`dates`) + `@tabler/icons-react`, Zod duplicado en el cliente (esquemas chicos, sin paquete compartido con el backend). Estructura en `frontend/src/`: `shared/` (cliente HTTP, auth, helpers de formularios) + `modules/<nombre>/` espejando los módulos del backend (cada uno con sus páginas, `api.ts`, `queries.ts`).

Hecho hasta ahora:
- **Fase A** — fundaciones: router, tema, `AuthContext` con persistencia real en `localStorage`, rutas protegidas, cliente HTTP con logout automático ante 401.
- **Fase B** — empresas: alta, edición, listado, selección de empresa activa.
- **Fase C** — empleados: alta, edición, baja/reactivación (reversible, nunca un delete real), búsqueda y filtro por estado (client-side).
- **Fase D** — importación: subida de archivo (Excel Oficial de Importación v1 + año/mes), listado de importaciones, detalle por filas (estado, montos, correcciones automáticas) y clasificación de conceptos pendientes desde el propio detalle.
- **Fase E** — corrección y confirmación: modal de corrección por fila (sin re-subir el archivo), revalidación reflejada al instante en la tabla, botón Confirmar habilitado solo con 0 filas con error.
- **Pantalla de revisión rediseñada (ADR-073, post-Fase E)**: la tabla plana de filas se reemplazó por una vista agrupada por empleado (orden original del archivo, no alfabético), con encabezado por grupo (conceptos/válidos/correcciones/errores + Bruto/Neto/Costo laboral — dato objetivo, rotulado "parcial" si el empleado tiene errores sin corregir; nunca las advertencias de negocio, que siguen siendo exclusivas del panel de validación posterior a confirmar), expandir/contraer por grupo (auto-expandido si tiene error) y todos a la vez, buscador global (nombre/apellido/CUIL/concepto), filtro por estado sobre el empleado completo (no por fila), barra lateral de navegación y botón flotante de siguiente/anterior error. La validación sigue siendo estrictamente línea por línea — el rediseño es 100% de presentación, sin cambios de backend/dominio.
- **Fase F** — validación y emisión: datos de emisión (fecha/lugar de pago y de cargas sociales), panel de validación (errores/advertencias por empleado), botón Emitir recibos (habilitado solo con datos completos y sin errores de validación — excluye automáticamente a los empleados dados de baja), tabla de recibos emitidos con descarga individual de PDF.
- **Fase G** — repositorio técnico (cierra el plan de 7 sub-fases): registro de usuario con checkbox de T&C/Acuerdo de Tratamiento de Datos (`/register`, antes no existía ninguna pantalla de registro), historial de recibos cruzando importaciones con filtro por empleado (`/empresas/:id/recibos`), anulación (con motivo) y reemisión, descarga por lote (ZIP), y auditoría por recibo (línea de tiempo de emisión/anulación/reemisión).

**Plan de 7 sub-fases completo (A-G).** Próximos pasos posibles: Docker Compose de punta a punta, revisión legal de los borradores de T&C/DPA, o lo que el usuario indique.

**Testing de frontend:** Vitest + Testing Library (unitario, acotado a lógica no trivial — helpers de validación, parseo de fechas, filtros — no snapshots de componentes) + verificación manual en un navegador real vía **Playwright MCP** (`.mcp.json` en la raíz del repositorio, fuera de `app/`) para cada fase antes de darla por terminada.

## Dependencias

Backend: NestJS, Prisma + PostgreSQL, Zod, argon2, JWT (Passport), pino, exceljs, Puppeteer, archiver, Vitest.
Frontend: React, React Router, TanStack Query, Mantine, Zod, Vitest + Testing Library.

Dev-only: `embedded-postgres` (devDependency) — Postgres real sin Docker para desarrollo local (ver "Cómo ejecutar"). Es un paquete en beta pensado solo para desarrollo/testing local, nunca para producción.

Ver `backend/package.json` y `frontend/package.json` para versiones exactas. Solo librerías open-source, sin tiers pagos, elegidas y justificadas para este proyecto (comparación de stack documentada fuera de este repositorio).

## Testing

```bash
cd backend
npm test          # Vitest: value objects, auth, importación (validador/conector Excel/confirmación/corrección de fila), catálogo de conceptos, validación Anexo III, emisión (snapshot/plantilla/gráfico/caso de uso), repositorio técnico (anulación/reemisión/historial/descarga)

cd frontend
npm run lint       # oxlint
```

## Backups

`backend/scripts/backup.mjs` genera un backup lógico completo:

- Un `.json` por tabla (usuarios, empresas, empleados, importaciones, filas, catálogo de conceptos, recibos, auditoría), vía Prisma — no depende de `pg_dump`.
- Una copia completa de `uploads/recibos/` (los PDF ya emitidos).
- Retención automática: conserva los últimos `BACKUP_RETENTION_CANTIDAD` backups (default 14) y borra el resto — sin esto, un backup diario sin supervisión llena el disco con el tiempo.

**Por qué se copian los PDF además de la base**, y no alcanza con la base sola: el hash de integridad de cada recibo (`Recibo.hashIntegridad`) se calculó sobre los bytes exactos del PDF en el momento de emitir. La plantilla del recibo cambia con el tiempo — volver a generar el PDF desde el snapshot guardado en la base, con la plantilla de hoy, no reproduce necesariamente los mismos bytes ni el mismo hash. El PDF original es la única copia donde ese hash sigue siendo válido.

### Programado + off-site (Docker Compose)

El servicio `backup` de `docker-compose.yml` (mismo build que `backend`) corre `backend/scripts/backup-loop.sh`: un backup apenas arranca y después uno cada 24h, sin supervisión manual. Si `RCLONE_REMOTE` está definido en `.env`, cada backup se copia además a un destino off-site vía `rclone` (recomendado: Oracle Cloud Object Storage, "Always Free" — ver `rclone.conf.example`, copiar a `rclone.conf` — gitignored — con las credenciales reales antes del primer `docker compose up`). Sin `RCLONE_REMOTE`, el backup sigue funcionando pero queda solo en este servidor — se avisa en el log (`docker compose logs backup`), nunca en silencio.

**Por qué importa el off-site**: un backup que vive nada más que en el mismo servidor no protege contra la falla de ese servidor (disco roto, VPS borrado por error, etc.) — sigue siendo un único punto de falla, solo que un paso más adelante.

### Restaurar

`backend/scripts/restore.mjs` (`npm run restore -- <directorio-backup>` desde `backend/`) carga un backup en una base ya migrada y vacía, respetando el orden de las referencias (`usuario` → `empresa` → `empleado`/`importacion` → `importacionFila`/`conceptoCatalogo`/`recibo` → `auditLog`), y copia `uploads-recibos/` de vuelta a `uploads/recibos/`. Dos pasos siempre separados, a propósito (crear estructura vacía vs. cargar datos no se mezclan en un solo comando):

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy   # 1. estructura, sobre una base vacía
DATABASE_URL="postgresql://..." npm run restore -- backups/<timestamp>   # 2. datos
```

**Probado de punta a punta (2026-07-22, Tarea 6 del plan de piloto), contra Postgres real:** `npm run backup` sobre la base de desarrollo real (8 usuarios, 6 empresas, 19 empleados, 17 recibos, 749 entradas de auditoría) → creada una base Postgres nueva y vacía (`recibos_restore_test`) → `prisma migrate deploy` → `restore.mjs` → los 8 conteos por tabla coincidieron exactamente con el backup, sin ningún error de clave foránea → se recalculó el SHA-256 de uno de los PDF restaurados y coincidió byte a byte con el `hashIntegridad` guardado en la base restaurada → el PDF se abrió y su contenido es el recibo real, íntegro. Base e datos de prueba borrados al terminar.

**Lo que no se probó**: el camino completo vía `docker compose` (el servicio `backup`, el volumen `backend_backups`, la copia real a un remoto de `rclone`) — Docker Desktop no está disponible en este entorno. El mecanismo de backup/restore en sí (la parte que de verdad puede perder datos si falla) sí quedó probado real, contra Postgres real, con verificación de hash — lo no probado es la orquestación alrededor.

## Seguridad

### Seguridad y credenciales

- **Generá `JWT_SECRET` y `ADMIN_REGISTRATION_TOKEN` propios antes de producción** — nunca los valores de `.env.example`. El server directamente no arranca en producción (`NODE_ENV=production`) si detecta que alguno de los dos sigue siendo el placeholder del ejemplo (`env.schema.ts`); en desarrollo/test no bloquea. Generar uno: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- **No hay usuario admin por defecto.** Cada instalación registra su propia primera cuenta con `POST /auth/register`, usando el `ADMIN_REGISTRATION_TOKEN` que vos mismo generaste — no viene ninguna cuenta precreada. Ver "Registro cerrado" más abajo y `OPERACION.md`.
- **Las credenciales `recibos`/`recibos` de `scripts/dev-db.mjs`** son solo para la base de Postgres embebida de desarrollo local (escucha únicamente en `127.0.0.1`) — nunca usarlas en producción, donde `POSTGRES_PASSWORD` se genera aparte (ver `.env.example` en la raíz de `app/`).
- **No subas `uploads/` ni datos reales de recibos/empleados al repo** — ya está en `.gitignore`, pero si alguna vez necesitás compartir un caso de prueba, generá datos ficticios, nunca copies un recibo real.

Alcance deliberadamente mínimo para un piloto acompañado (una instancia, un cliente) — no es endurecimiento para Internet abierta (eso queda para cuando haya evidencia de que hace falta, ver más abajo):

- **Registro cerrado.** `POST /auth/register` exige el header `X-Admin-Registration-Token` (`AdminRegistrationGuard`, comparación en tiempo constante) — sin él, 403. Quien administra la instancia crea cada cuenta nueva; no hay alta pública. La pantalla `/register` del frontend sigue existiendo (para uso propio, pidiendo el token en el formulario), pero ya no está enlazada desde el login. Procedimiento paso a paso: **`OPERACION.md`**.
- **Rate limiting en login.** `POST /auth/login` acepta como máximo 5 intentos por minuto por IP (`@nestjs/throttler`, límite propio más estricto que el default global de 60/min). Sin esto, una password de 8 caracteres sin bloqueo de cuenta quedaba abierta a fuerza bruta.
- **Sin recuperación de contraseña por email.** No hay esa infraestructura (decisión explícita, ver `OPERACION.md`) — si alguien queda afuera de su cuenta, `backend/scripts/reset-password.mjs` la resetea a mano, con el mismo hash (argon2) que usa el login. Procedimiento probado real: ver `OPERACION.md`.

**Explícitamente fuera de este alcance** (Post Piloto, cuando haya más de un cliente o la instancia deje de ser conocida solo por quien la opera): Helmet, CSP, HSTS, CORS afinado por dominio, WAF, auditoría continua de dependencias. La superficie real hoy es una instancia, con pocas cuentas, en un dominio que nadie más conoce.

## Cómo hacer deploy

Para el piloto (un único host, un único cliente): `docker compose up --build -d` sobre este mismo `docker-compose.yml`, con `.env` completo (`JWT_SECRET`, `POSTGRES_PASSWORD`, `DOMINIO`) — ver la sección "Con Docker Compose" más arriba. Requisitos del host: Docker + Docker Compose instalados, puertos `80`/`443` abiertos, y el dominio de `DOMINIO` apuntando por DNS a la IP pública antes de levantar el stack (si no hay un dominio propio todavía, un subdominio gratis de DuckDNS alcanza).

`postgres_data` (datos de la base) y `caddy_data` (certificados TLS, se renuevan solos) son volúmenes con nombre — sobreviven a un `docker compose down` normal; solo se pierden con `docker compose down -v` (evitar, salvo reinstalación completa a propósito).

Si en el futuro se necesita más de una instancia o un proveedor cloud gestionado, cada servicio ya tiene su `Dockerfile` (multi-stage, imagen final liviana) y puede desplegarse de forma independiente detrás de un balanceador, con `DATABASE_URL`/`JWT_SECRET`/`POSTGRES_PASSWORD` provistos como secretos de la plataforma — nunca hardcodeados ni en el repositorio. No es el camino elegido para el piloto (un solo host es más simple y suficiente para un cliente).

## Estado

Fase 0 (fundaciones técnicas), Fase 1 (ingesta: conector CSV → modelo canónico), Fase 2 (catálogo de conceptos: conceptos → categorías normativas), Fase 3 (validación: cuadre de totales, bloqueos y advertencias Anexo III), Fase 4 (emisión: recibo inmutable con snapshot + hash, PDF Anexo III con gráfico de torta vía Puppeteer), Fase 5 (repositorio técnico: anulación/reemisión, historial, descarga por lote, deslinde T&C/DPA) y Fase 6 (robustez de conectores: conector Excel, tolerancia de encabezado/orden/filas vacías, corrección de fila sin re-subir) del roadmap — **MVP completo (Fases 0 a 6)**. Ver el roadmap completo fuera de este repositorio.
