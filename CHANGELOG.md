# CHANGELOG

Formato basado en [Keep a Changelog](https://keepachangelog.com/). Este proyecto aún no tiene versiones publicadas (pre-release).

## [Unreleased] — Revisión de fidelidad del motor (Etapa 1 del plan de 9 etapas): 2 bugs reales corregidos

Generando PDFs reales con combinaciones de datos nunca probadas juntas (concepto no remunerativo real, empleado sin ningún dato opcional de ficha, sin contribuciones patronales, caso más denso hasta ahora) aparecieron 2 bugs de fidelidad que ningún test anterior detectaba. Ver ADR-065 en `DECISIONS.md`.

### Corregido
- **Remunerativo y No remunerativo ya no se mezclan en una sola tabla.** El Excel oficial los trae como dos tablas separadas; ahora `plantilla-recibo.ts` también — cada una con su propio total, la de No remunerativo solo aparece si hay al menos un concepto de ese tipo.
- **Ya no se muestra una tabla fantasma con un total en $0** cuando una sección entera no tiene conceptos (ej. un empleado real sin contribuciones patronales en el archivo de origen). `envolverTabla` ahora se omite a sí misma cuando no hay filas, en un solo lugar, en vez de repetir la condición en cada call-site.
- Ajuste cosmético ya anotado como pendiente: la leyenda del gráfico de torta gana algo de ancho y el monto+porcentaje de cada ítem ya no se separan entre sí al hacer wrap.

### Verificado
`tsc`, lint y 214 tests en verde (4 tests nuevos). PDFs reales generados directo con `construirSnapshotRecibo` + `PuppeteerGeneradorPdf` para los 4 casos de arriba, revisados visualmente uno por uno.

## [Unreleased] — Auditoría completa de cambios de clasificación de un concepto del catálogo

Cierra un hallazgo pendiente desde la revisión funcional del catálogo de conceptos. Ver ADR-064 en `DECISIONS.md`.

### Agregado
- `DefinirMapeoConceptoUseCase` ahora registra en `AuditLog` el diff completo al redefinir un concepto: `accion` (`crear`/`modificar`), `campo: 'clasificacion'`, `valorAnterior`/`valorNuevo` (tipo + categoría de contribución). No se registra nada si se reenvía exactamente la misma clasificación (sin cambio real).
- Nuevo endpoint `GET /empresas/:id/conceptos-mapeados/:perfilMapeoId/auditoria` (mismo patrón que el ya existente para recibos).
- `AuditLogRepository` gana un método de escritura (`create`), reemplazando el `@Auditable` genérico en este endpoint puntual (que solo sabía registrar "crear" sin el valor anterior, y hubiera duplicado el registro).

### Verificado
Backend: `tsc`, lint y 211 tests en verde. Contra Postgres real: crear un concepto queda con `valorAnterior: null`; redefinirlo queda como `modificar` con el valor anterior correcto; reenviar la misma clasificación no agrega una entrada nueva.

### Pendiente
No se construyó pantalla de frontend para consultar esta auditoría — no existe todavía una pantalla de catálogo de conceptos más allá del panel de "conceptos sin mapear"; agregarla es una tarea aparte.

## [Unreleased] — Prueba de carga real + pool acotado de emisión + paginación del historial

Se ejecutó una prueba de carga real (20/100/300 empleados en una sola importación, contra la API y Postgres reales) para verificar las 4 optimizaciones de la entrada anterior bajo volumen — sin bugs funcionales, y con dos hallazgos reales resueltos en esta misma entrada. Ver ADR-063 en `DECISIONS.md`.

### Cambiado
- `EmitirRecibosUseCase` genera los PDF del lote con un pool acotado de 5 en simultáneo (`ejecutarConLimite`, utilidad nueva sin librería externa) en vez de uno a la vez — la numeración correlativa se asigna antes de paralelizar para no depender del orden real de finalización. Medido con datos reales: ~364-368ms/empleado (antes ~530ms/empleado), sin cambiar el contrato síncrono de un único request HTTP.
- Historial de recibos (`GET /empresas/:id/recibos`) paginado (20 por página por defecto, `?pagina=`) tanto en el backend (`ReciboRepository.findAllByEmpresa` devuelve `{ recibos, total, pagina, porPagina }`) como en el frontend (`HistorialRecibosPage`, control de paginación de Mantine).

### Corregido
- **Bug real encontrado verificando el propio cambio de arriba**: al paralelizar la emisión, ordenar el historial por `fechaEmision` dejó de garantizar el orden de `numero` (dos recibos del mismo lote concurrente pueden completarse en cualquier orden). Corregido ordenando por `numero desc`, el campo correlativo real, asignado de forma determinística antes de paralelizar.

### Verificado
Backend: `tsc`, lint y 208 tests en verde. Frontend: `tsc`, lint y 24 tests en verde. Contra datos reales: emisión paralela de 25 y 100 empleados sin corrupción entre PDFs concurrentes, historial de 100 recibos paginado en 5 páginas de 20 con orden estrictamente correlativo, navegación entre páginas confirmada en un navegador real.

## [Unreleased] — Limpieza del entorno de pruebas + 4 optimizaciones de N+1/queries sin límite

Antes de seguir agregando funcionalidad, se pidió un perfil de rendimiento (medir, no optimizar a ciegas) pensando en miles de empleados, y una limpieza completa del entorno (todo lo que había era dato de prueba). Ver ADR-062 en `DECISIONS.md`.

### Cambiado
- `findConfirmadasAnteriores` (repositorio de Importación) acotado a las últimas 3 importaciones confirmadas de la empresa (antes traía todo el historial completo, con todas sus filas) — nuevo índice compuesto `(empresaId, estado, anio, mes)`.
- Creación de empleados al confirmar una importación: de un `create` por CUIL nuevo dentro de un loop, a una búsqueda batch + `createMany({ skipDuplicates: true })`.
- Auto-clasificación de conceptos al confirmar: de un barrido completo de la empresa por cada concepto del catálogo, a una única lectura agrupada por concepto + un `updateMany` acotado por lista de ids por concepto.
- Búsqueda de empleado al emitir recibos: de un `findByCuilAndEmpresa` por fila dentro del loop, a una única búsqueda batch antes de emitir.
- **Explícitamente no tocado**: generación de PDF (Puppeteer, sigue secuencial — sin evidencia real de volumen que justifique paralelizarla) y ningún cálculo de negocio del Anexo III (sigue fuera de la base de datos, ADR-005).

### Verificado
`tsc -p tsconfig.eslint.json --noEmit`, lint y el suite completo de tests en verde (fakes de test actualizados en los módulos de empleados/importación/emisión/validación/mapeo). Además, verificado con datos reales contra Postgres (script puntual, creado y eliminado en esta misma tarea): los 4 métodos nuevos producen exactamente el resultado esperado (sin duplicar empleados, agrupación por concepto normalizado correcta, actualización acotada a los ids esperados).

### Operacional
Entorno de pruebas reiniciado por completo: las 8 tablas con datos de prueba vaciadas (`TRUNCATE ... RESTART IDENTITY CASCADE`), PDFs de `uploads/recibos/` y artefactos de `.playwright-mcp/` eliminados. Ninguno de los datos borrados era real. Estrategia de nombres para futuras corridas de prueba (ej. "Empresa Demo A", "Empresa QA Julio") acordada para no repetir nombres entre pruebas, pendiente de aplicarse en el próximo escenario nuevo.

## [Unreleased] — Prueba funcional integral (E2E) del flujo completo antes de cerrar el MVP

Antes de considerar cerrado el MVP se ejecutó una prueba funcional completa desde la interfaz web (Playwright real + backend real): registro, login, alta de empresa, importación de un archivo con un CUIL inválido real, corrección de esa fila sin re-subir el archivo, mapeo de 9 conceptos reales del Anexo III, confirmación, validación, edición de fichas de empleado (categoría/legajo/banco), emisión de recibos, descarga y verificación visual de los PDF, historial de recibos, anular + reemitir, auditoría, y navegación con los botones de volver de cada pantalla.

### Corregido
- `nest start --watch` reiniciaba el servidor completo cada vez que se escribía un PDF de recibo, porque `app/backend/uploads/` no estaba excluido del watcher de TypeScript. Esto cortó una emisión en lote real a mitad de camino (recibos parciales, `ERR_CONNECTION_REFUSED` en el navegador). Fix: `uploads` agregado a `exclude` y a `watchOptions.excludeDirectories` en `tsconfig.json`. Ver ADR-057.

### Verificado
Flujo completo confirmado end-to-end con datos reales del Anexo III (Jubilación, SIPA, OSECAC, ART+FFEP, Sindicato). Ver ADR-057 para el detalle y las dos limitaciones de robustez encontradas (emisión en lote no atómica, auditoría no atómica con la creación del recibo) que quedan pendientes de decisión, no corregidas en esta tarea.

## [Unreleased] — Período trabajado: campos "Mes/Año" y "Período" separados

El Excel oficial trae dos campos distintos donde el sistema solo mostraba uno (ver ADR-061 en `DECISIONS.md`).

### Agregado
- Campo "Mes/Año" en la ficha de identificación: texto completo (ej. "Junio 2026"), derivado del mes de la fecha de pago.

### Cambiado
- El campo "Período" pasa de mostrar texto completo (ej. "Julio 2026") a formato abreviado tipo Excel (ej. "jul-26"), igual que el oficial. Sigue derivado de `anio`/`mes` — ningún dato nuevo de entrada.

### Verificado
`tsc`, lint y 200 tests en verde. PDF real reproduciendo el caso del Excel oficial (recibo de junio, período mayo): "MES/AÑO: Junio 2026" / "PERÍODO: may-26", idéntico al ejemplo real.

## [Unreleased] — Fidelidad del recibo al Anexo III oficial: orden de la Firma, resumen redundante, regla de subtotales

Tras la revisión funcional del recibo generado contra el Excel oficial, se implementaron 3 de los 4 hallazgos (ver ADR-060 en `DECISIONS.md`).

### Cambiado
- La Firma ("Recibí conforme la suma indicada...") se renderiza ahora inmediatamente después del Sueldo Neto, antes del Detalle de composición salarial y el gráfico de torta — orden idéntico al Excel oficial (antes iba después de ambos).
- El subtotal de una categoría de contribución patronal ("Subtotal Seguridad Social", etc.) solo se muestra cuando esa categoría agrupa 2 o más conceptos; con un único concepto se omite, porque era idéntico al monto de esa fila.

### Quitado
- La línea de resumen "Remunerativo: $X No remunerativo: $Y Descuentos: $Z" — repetía sin agregar dato nuevo los totales ya mostrados en la misma sección.

### Verificado
`tsc`, lint y 199 tests en verde (2 tests reescritos, 2 nuevos). Confirmado además con un PDF real generado con 3 categorías de contribución patronal (una con 2 conceptos, dos con 1 concepto cada una).

## [Unreleased] — Modelo funcional del Anexo III aprobado; campo Banco y rediseño del gráfico de torta

Tras la aprobación de `docs/modelo-funcional-anexo-iii.md` como especificación funcional base (ver ADR-055/056 en `DECISIONS.md`), se implementaron los dos hallazgos de ese análisis que requerían código.

### Agregado
- `Empleado.banco` (opcional, mismo patrón que `legajo`): Prisma, entidad de dominio, DTO/use case/mapper/repositorio de actualización, `ReciboSnapshot`, `plantilla-recibo.ts` (ficha de identificación, junto al CUIL). Frontend: columna en la tabla de empleados y campo en `EditarEmpleadoModal`.

### Cambiado
- `construirSegmentosCostoLaboral`: el gráfico de torta del recibo pasa de mostrar "Remuneración + contribución patronal cruda por categoría" a la lectura oficial del Anexo III: "Sueldo Neto + costo combinado Empleador+Trabajador por categoría", reutilizando los mismos totales que ya calcula `construirDetalleComposicionSalarial` en vez de recalcularlos. `COLOR_REMUNERACION` renombrado a `COLOR_NETO`.

### Verificado end-to-end
Backend: `tsc`, lint y 197 tests en verde (suite del gráfico de torta reescrita para la nueva firma). Frontend: `tsc`, lint y 24 tests en verde. Campo Banco verificado contra Postgres real (API) y con Playwright real (columna, modal, edición). Gráfico de torta verificado con una corrida real de `construirSnapshotRecibo` contra datos con categorías cruzadas, confirmando que los gajos siguen sumando exactamente el Costo Total Empleador.

### Verificado (contrato de importación)
Se contrastó `docs/contrato-excel-oficial-importacion.md` contra el modelo funcional (secciones "Origen de cada dato" e "Información mínima necesaria"): v1 ya lo satisface sin cambios — `Banco` es dato de ficha del trabajador, no una columna del Excel, igual que `categoria`/`fechaIngreso`/`legajo`. No se generó una v2.

## [Unreleased] — Bug real: sin forma de volver desde la home de una empresa

El usuario reportó que al entrar a una empresa (`EmpresaHomePage`) no podía volver al listado de Empresas. Confirmado: era la única pantalla del árbol de navegación sin breadcrumb de vuelta (todas las demás — Empleados, Importaciones, Historial — sí lo tenían), y el logo del header ("Recibos de sueldo") tampoco era un link. Corregido: breadcrumb "← Empresas" agregado en `EmpresaHomePage`, y el logo del header ahora navega a `/` desde cualquier pantalla (`AppShellLayout`). Verificado clickeando ambos en un navegador real.

## [Unreleased] — Plantilla descargable en el modal de importar

Gap detectado por el usuario al usar la pantalla real: existía la especificación escrita del Excel Oficial de Importación v1 (`docs/contrato-excel-oficial-importacion.md`) pero ningún archivo de ejemplo descargable para armar el propio. Se agregó `app/frontend/public/plantilla-excel-oficial-importacion-v1.xlsx` (generado con el conector `conectores/csv-legado`, dos filas de ejemplo con las 7 columnas) y un link "Descargar plantilla de ejemplo" en `ImportarArchivoModal`. Verificado end-to-end: se descargó la plantilla desde el navegador y se volvió a subir con éxito (2 filas válidas).

## [Unreleased] — Reversión: formato único de ingesta (Excel Oficial de Importación v1) + conectores externos

**Cambio de arquitectura pedido directamente por el dueño del producto** (ver `DECISIONS.md`, ADR-054, que enmienda ADR-016). El núcleo pasa de soportar varios formatos de ingesta (CSV + Excel) a aceptar **un único formato oficial**: un Excel canónico y versionado ("Excel Oficial de Importación v1", especificado en `docs/contrato-excel-oficial-importacion.md`). Cualquier integración con un sistema de liquidación externo se resuelve mediante **conectores externos al núcleo** — módulos independientes, no parte de `app/`.

### Quitado
- Soporte de `.csv` y `.xls` en el núcleo. `ConectorImportacion` conserva un único conector (Excel); `EXTENSION_A_CONECTOR` se reemplaza por una única constante `EXTENSION_ARCHIVO_OFICIAL`. `CsvConectorImportacion` y su test se eliminan del núcleo (relocados, ver "Agregado"). Dependencia `csv-parse` quitada de `app/backend/package.json`.
- Frontend: `ImportarArchivoModal` ya no ofrece `.csv`/`.xls` (`accept=".xlsx"`, textos actualizados).

### Agregado
- **`docs/contrato-excel-oficial-importacion.md`**: especificación completa y aprobada por el usuario del formato — hojas, columnas (obligatorias/opcionales), tipos, reglas de validación, ejemplos válidos/inválidos, tolerancia del parser y regla de versionado a v2. Formaliza el comportamiento ya existente de `ExcelConectorImportacion`, sin cambios de parser.
- **`conectores/csv-legado/`** (nuevo directorio en la raíz, hermano de `app/`): primer ejemplo concreto de "conector externo" — paquete standalone (propio `package.json`, sin dependencia de NestJS ni de tipos del núcleo) que transforma un CSV legado en un `.xlsx` válido según el contrato oficial. Establece el patrón (`conectores/<nombre>/`) para cualquier integración futura (Tango, Bejerman, SAP, Calipso, etc.).
- `ADR-054` en `DECISIONS.md` (enmienda `ADR-016`).

### Verificado end-to-end
Backend: 196 tests en verde (7 menos, los del conector CSV eliminado), `tsc --noEmit`, build y lint limpios. `conectores/csv-legado`: 5 tests propios en verde. **Prueba real del contrato**: se generó un `.xlsx` con el CLI de `conectores/csv-legado` a partir de un CSV de prueba, se subió ese archivo al backend real (`curl`) y se confirmó que el núcleo lo acepta y parsea correctamente a través del flujo normal de importación — sin que el núcleo conozca nada del conector que lo generó. Caso negativo confirmado: subir un `.csv` directo ahora se rechaza con el mensaje nuevo. Repetido clickeando en un navegador real: `ImportarArchivoModal` ya no ofrece CSV, y un `.xlsx` generado por el conector externo se importa correctamente desde la UI.

## [Unreleased] — Frontend Fase G: repositorio técnico, registro con T&C, auditoría por recibo

**Cierra el plan de 7 sub-fases del frontend (A-G completas).**

### Agregado
- **Corregido `AuditInterceptor`**: registraba auditoría leyendo `result.id`, que funciona para endpoints que devuelven un objeto pero no para `POST .../recibos/emitir` (devuelve un array) — la emisión de recibos nunca quedaba auditada. Ahora recorre el array y registra un log por cada elemento; sin regresión sobre los endpoints existentes (objeto único).
- **`GET /empresas/:id/importaciones/:id/recibos/:reciboId/auditoria`**: nuevo endpoint (puerto `AuditLogRepository` + `PrismaAuditLogRepository`, nuevos — la escritura de auditoría ya existía, la lectura no). Devuelve el historial cronológico de acciones (emitir/anular/reemitir) de un recibo puntual.
- **Frontend — registro de usuario**: `RegisterPage` nueva (no existía ninguna pantalla de registro; todos los usuarios de prueba de sesiones anteriores se habían creado por `curl`), con checkbox de T&C + Acuerdo de Tratamiento de Datos (texto embebido en `modules/legal/`, copiado de `docs/legal/` vigente al momento de esta fase) y auto-login tras crear la cuenta.
- **Frontend — historial de recibos**: `HistorialRecibosPage` (`/empresas/:id/recibos`, cruza todas las importaciones de la empresa, filtro por empleado) usando el endpoint ya existente desde Fase 5. Componente `RecibosTable` extraído y reutilizado tanto acá como en `EmisionSection` (Fase F) para no duplicar la tabla de recibos con sus acciones.
- **Frontend — acciones sobre un recibo**: anular (modal con motivo obligatorio), reemitir, descarga individual y "Ver auditoría" (línea de tiempo con las acciones registradas), todas ya con endpoint listo desde Fase 5. Descarga por lote (ZIP) agregada en `EmisionSection`.
- Tests unitarios: `AuditInterceptor` (3, backend — cubre el caso array, el caso objeto sin regresión, y "sin metadata no registra nada`), `ListarAuditoriaReciboUseCase` (4, backend).

### Verificado end-to-end
Backend: emitir → anular → reemitir vía curl, confirmando en cada paso que `GET .../auditoria` del recibo acumula las acciones correctas (antes del fix, "emitir" no aparecía nunca); historial de empresa y descarga por lote también verificados. Frontend, clickeando en un navegador real: registro de una cuenta nueva con el checkbox de T&C (incluido abrir el modal y leer el texto) → auto-login → cierre de sesión → login con una cuenta de prueba con recibos ya emitidos → historial de recibos con badge de estado y motivo de anulación → anular un recibo vigente (con motivo) → reemitir el anulado → confirmar que el nuevo recibo aparece vigente y que el anulado ya no ofrece "Reemitir" (fue reemplazado) → "Ver auditoría" mostrando el evento correcto para cada recibo (el original con "Emitido"+"Anulado", el reemitido con solo "Reemitido") → descarga por lote (ZIP válido, firma de archivo verificada) desde el detalle de la importación.

## [Unreleased] — Frontend (Fase A y B) + edición de empresa

### Agregado
- **`PATCH /empresas/:id`**: primer endpoint de edición de empresa (razón social, CUIT, nombre de fantasía, domicilio, localidad, provincia, código postal — todos opcionales, al menos uno requerido). Mismo patrón exacto que `ActualizarEmpleadoUseCase`; sin decisiones de diseño nuevas. Detectado como hueco al planificar el frontend (Fase B necesitaba poder editar una empresa y el endpoint no existía).
- **Frontend, Fase A (fundaciones)**: router (React Router), TanStack Query, Mantine (tema propio), cliente HTTP compartido con inyección de token y logout automático ante 401, `AuthContext` con persistencia real en `localStorage` (el stub anterior perdía la sesión al refrescar), rutas protegidas, shell principal.
- **Frontend, Fase B (empresas)**: alta, edición, listado y selección de empresa activa (`/`, `/empresas/:empresaId`) — primera pantalla funcional más allá del login.
- Tests unitarios nuevos: `ActualizarEmpresaUseCase` (5, backend); `AuthContext`, cliente HTTP (10, frontend, Fase A); ver detalle de Fase B en el resumen de esa fase.

### Verificado end-to-end
Backend: `PATCH /empresas/:id` contra el backend real — actualiza un campo sin tocar los demás, rechaza sin campos (400, Zod), rechaza empresa ajena/inexistente (404). Frontend: build/lint/test en verde; verificado además clickeando de verdad en un navegador real (Playwright MCP, configurado a pedido del usuario en esta misma sesión) — login, alta/edición de empresa desde dos pantallas, navegación y persistencia confirmados.

## [Unreleased] — Frontend Fase F: validación, datos de emisión y emisión de recibos

### Agregado
- **`EmitirRecibosUseCase`**: ahora saltea (no emite recibo) para cualquier empleado con `estado: 'inactivo'` — la regla que Fase C había dejado anotada para reforzarse recién acá. Mismo patrón que el salteo ya existente para un CUIL sin empleado encontrado (`continue`, no bloquea el resto del lote).
- **Frontend**: formulario inline de datos de emisión (`DatosEmisionForm`, `PATCH .../datos-emision`, endpoint ya existente desde Fase 4) dentro de `ImportacionDetailPage` una vez `confirmada`; módulo `validacion` nuevo (`GET .../validacion`, ya existente) con `ValidacionPanel` (errores globales, totales y errores/advertencias por empleado); módulo `emision` nuevo (`GET/POST .../recibos`, `GET .../recibos/:id/descargar`, todos ya existentes) con `EmisionSection` que agrupa datos de emisión + validación + botón "Emitir recibos" (deshabilitado hasta `datosEmisionCompletos && puedeEmitirse`) + tabla de recibos emitidos con descarga individual (reutiliza `downloadFile`, ya scaffoldeado en Fase A).
- Tests unitarios: `EmitirRecibosUseCase` — nuevo caso "no emite recibo para un empleado dado de baja, pero sí para el resto" (backend).

### Corregido
- **Bug real encontrado con la verificación en navegador**: el `DatePickerInput` de Mantine (v9) puede emitir un string `"YYYY-MM-DD"` al elegir una fecha del calendario, no necesariamente un `Date` — `z.date()` a secas rechazaba ese valor con "Invalid input: expected date, received string" al guardar. Afecta a cualquier esquema cliente que valide un campo de fecha editado a través del date picker; corregido usando `z.coerce.date()` en `datosEmisionSchema` (nuevo) y en `editarEmpleadoSchema` (Fase C — el bug ya estaba latente ahí, nunca se había disparado porque esa verificación anterior nunca llegó a cambiar la fecha vía el calendario, solo a releerla).

### Verificado end-to-end
Backend: 196 tests (incluido el nuevo), `tsc --noEmit`, build y lint en verde. Frontend, clickeando en un navegador real: se dio de baja a un empleado con fila válida en una importación confirmada → se completaron los 4 datos de emisión → el panel de validación mostró a ambos empleados con advertencias de variación de neto (no bloqueantes) → "Emitir recibos" pasó de deshabilitado a habilitado → al emitir, se generó **un solo recibo** (el del empleado activo), confirmando que el inactivo quedó excluido → se descargó el PDF real (`Recibo - Pérez Juan.pdf`, nomenclatura correcta) y se verificó que es un PDF válido de una sola página.

## [Unreleased] — Frontend Fase E: corrección de filas y confirmación de importación

### Agregado
- **Frontend**: modal de corrección de fila (`CorregirFilaModal`, `PATCH .../filas/:filaId`, ya existía desde Fase 6 — sin cambios de backend) con los 7 campos pre-cargados con los valores crudos actuales de la fila (cuil/nombre/apellido/concepto/monto/unidad/base); botón "Corregir" por fila y botón "Confirmar" (`POST .../confirmar`, también preexistente) en `ImportacionDetailPage`, ambos visibles solo mientras la importación sigue `previsualizada`. "Confirmar" queda deshabilitado mientras `filasConError > 0`, igual que pide el criterio de aceptación de esta fase.
- Al confirmar también se invalida la lista de "conceptos sin mapear" de la empresa (no solo la propia importación): confirmar dispara auto-clasificación (Fase 2) que puede sacar un concepto de esa lista aunque el usuario nunca lo haya mapeado a mano en esta pantalla.

### Verificado end-to-end
Clickeando en un navegador real: se subió un archivo con una fila con monto inválido a propósito → "Confirmar" apareció deshabilitado con "Con error: 1" → se corrigió la fila desde el modal (pre-carga correcta de los valores actuales, incluido el valor inválido) → la tabla se revalidó sola mostrando la fila como "Válida" y "Con error: 0" → "Confirmar" pasó a estar habilitado → al confirmar, la importación quedó en estado "Confirmada" y los botones de corrección/confirmar desaparecieron (ya no tiene sentido corregir una importación confirmada, y el backend lo rechazaría si se intentara).

## [Unreleased] — Frontend Fase D: importación (subida, detalle por filas, mapeo de conceptos)

### Agregado
- **`GET /empresas/:id/importaciones`**: nuevo endpoint de listado de importaciones de una empresa (ordenadas por fecha, más reciente primero). No existía ningún endpoint para listar — solo `GET .../importaciones/:id` (una puntual). Detectado como hueco al construir la pantalla de historial de importaciones. Usa una respuesta liviana (`ImportacionResumenResponse`, sin el array de filas) para no sobrecargar un listado.
- **Frontend**: pantalla de listado de importaciones (`/empresas/:empresaId/importaciones`) con acceso desde la home de la empresa; modal de subida de archivo (`ImportarArchivoModal`, año/mes + CSV o Excel); pantalla de detalle (`/empresas/:empresaId/importaciones/:importacionId`) con contadores (total/válidas/con error/sin clasificar/con corrección automática), tabla completa de filas con estado y mensajes de error/corrección, y panel de conceptos pendientes de mapear con modal de mapeo (`MapearConceptoModal`, tipo + categoría de contribución cuando corresponde).
- Tests unitarios: `ListarImportacionesUseCase` (2, backend), `formatearMonto` (2, frontend — función pura extraída para mostrar el texto crudo del archivo cuando una fila inválida no tiene monto parseable).

### Verificado end-to-end
Backend: `GET /empresas/:id/importaciones` contra el backend real — devuelve las 4 importaciones de prueba ordenadas correctamente, con la forma liviana esperada. Frontend, clickeando en un navegador real: listado completo de importaciones existentes, detalle de una importación con 51 filas y de otra con correcciones automáticas visibles, subida real de un archivo CSV nuevo (con un concepto sin mapear a propósito) → panel de "conceptos sin mapear" apareció con el contador correcto → mapeo del concepto nuevo → panel desaparece y el contador de "sin clasificar" baja a 0 sin recargar la página (invalidación de query confirmada en vivo).

## [Unreleased] — Frontend Fase C: empleados (alta, edición, baja/reactivación, búsqueda)

### Agregado
- **`PATCH /empresas/:id/empleados/:id/estado`**: nuevo endpoint para dar de baja/reactivar un empleado (`{estado: 'activo'|'inactivo'}`). Nunca es un delete real — los recibos ya emitidos referencian `empleadoId` para siempre (ADR-018) — así que "baja" es reversible con el mismo endpoint. `Empleado.estado` ya existía en el schema desde Fase 0 (default `'activo'`) pero ningún caso de uso lo tocaba hasta ahora; de paso se agregó un tipo `EstadoEmpleado` y validación en la entidad (antes era un `string` suelto, sin chequeo de valores válidos).
- **Frontend**: pantalla de empleados (`/empresas/:empresaId/empleados`) — alta y edición en modales separados (el backend tampoco comparte campos entre crear y editar: nombre/apellido/CUIL son de identidad, fijos después de creado; categoría/fecha de ingreso/legajo son la ficha, editable), listado con badge de estado, búsqueda por nombre/apellido/CUIL y switch "Mostrar inactivos" (ambos client-side, sin cambios de API), botón Dar de baja/Reactivar por fila.
- Tests unitarios: `CambiarEstadoEmpleadoUseCase` (4, backend), `filtrarEmpleados` (4, frontend — lógica de búsqueda extraída a función pura para poder testearla sin montar el componente), `parsearFechaLocal` (1, frontend), `omitirVacios` actualizado para el caso de fechas.

### Corregido
- **Bug real encontrado con la verificación en navegador (no lo hubiera atrapado ningún test ni build/lint)**: el modal de edición de empleado mostraba la fecha de ingreso un día antes de la real (ej. "11 de octubre" en vez de "12 de octubre"). Causa: `new Date('2016-10-12')` interpreta un string "solo fecha" como medianoche UTC; en un huso horario negativo (Argentina, UTC-3) esa medianoche UTC cae la noche anterior en hora local, y el date picker siempre renderiza en hora local. Se agregó `parsearFechaLocal()` (`shared/forms/`) que arma el `Date` a partir de los componentes año/mes/día (interpretados como locales por el propio constructor de `Date`), evitando el problema de raíz — reutilizable para cualquier fecha "solo día" que venga del backend en fases futuras (fecha de pago, etc.).

### Verificado end-to-end
Backend: dar de baja y reactivar un empleado real vía curl, valor de estado inválido rechazado (400, Zod). Frontend, clickeando en un navegador real: listado completo, dar de baja (desaparece de la vista por defecto) → mostrar inactivos (reaparece con badge "Inactivo" y botón "Reactivar") → reactivar → editar un empleado con fecha de ingreso ya cargada (detectó y corrigió el bug de fecha de arriba) → guardar sin que la fecha se corra → crear un empleado nuevo con un CUIL con dígito verificador calculado a mano → buscar por nombre y confirmar que el filtro reduce la lista correctamente.

## [Unreleased] — Fase 6: robustez de conectores (Excel, tolerancia a errores, corrección de filas)

### Agregado
- **Conector Excel (.xlsx/.xls)**: misma plantilla que el CSV (mismas columnas), vía `exceljs`. `ImportarArchivoUseCase` elige el conector según la extensión del archivo, rechazando cualquier otra con un mensaje claro. El puerto `ConectorImportacion` pasa a ser async (leer un `.xlsx` es inherentemente asincrónico) — el conector CSV se adapta sin cambiar su comportamiento.
- **Tolerancia de encabezado compartida** entre ambos conectores (`mapearRegistroPorEncabezado()`): mayúsculas/minúsculas y espacios de más en los nombres de columna ya no rompen el archivo. El orden de columnas y las filas completamente vacías ya se toleraban (CSV) — ahora con tests de regresión explícitos, y el mismo comportamiento también en Excel.
- **Número de fila real preservado incluso salteando filas vacías**: se detectó que el conector CSV renumeraba de forma contigua tras saltear líneas en blanco (un error podía reportar "fila 3" siendo en realidad la fila 4 del archivo). Corregido usando el hook `on_record` de `csv-parse` (expone la línea real acumulada); el conector Excel ya lo hacía bien por diseño.
- **Correcciones automáticas informadas**: `validarFilaImportacion` ya normalizaba bastante sin bloquear la fila (CUIL sin guiones/puntos, monto con coma decimal, espacios de más) — ahora lo informa vía un nuevo campo `correcciones: string[]` por fila, sumado en `filasConCorrecciones` en el resumen de la importación. Acotado deliberadamente a formato (nunca capitalización ni contenido).
- **Corrección de fila sin re-subir el archivo**: `PATCH /empresas/:id/importaciones/:id/filas/:filaId` — corrige cualquier subconjunto de campos de una fila puntual (solo mientras la importación está `previsualizada`), reutilizando `validarFilaImportacion` tal cual. Como solo se toca esa fila, el resto de la importación queda intacto (revalidación incremental). `ImportacionFilaResponse` ahora expone el `id` de cada fila (necesario para poder direccionar el nuevo endpoint).
- Tests unitarios (Vitest): `columnasObligatoriasFaltantes`/`mapearRegistroPorEncabezado` (6), `ExcelConectorImportacion` (7), `correcciones` en `validarFilaImportacion` (5), `CorregirFilaImportacionUseCase` (8), más tests nuevos de tolerancia en `CsvConectorImportacion` (3) — 29 tests nuevos.

### Corregido
- Ver el hallazgo de renumeración de filas más arriba (no es un bug de esta fase, ya existía desde Fase 1 — nadie lo había notado porque no había un test explícito de filas vacías con aserción de número de fila).

### Verificado end-to-end (contra el backend real en ejecución)
CSV con encabezados mezclados (mayúsculas, espacios, orden de columnas distinto) y CUILs con guiones/puntos → ambas filas válidas, con `correcciones` reportando la limpieza de cada CUIL → mismo contenido como `.xlsx`, con una fila en blanco de por medio y una fila con CUIL realmente inválido → la fila en blanco se saltea sin romper nada, la fila con error reporta su número de fila real (4) → se corrige esa fila vía el nuevo endpoint (sin re-subir el archivo) → queda válida, sin tocar la otra fila → se confirma la importación (autoclasifica los conceptos, ya mapeados de sesiones anteriores) → corregir una fila después de confirmada se rechaza (400) → extensión de archivo no soportada rechazada con mensaje claro → corrección sin ningún campo rechazada por validación.

### Pendiente (fuera de esta tarea)
Con esto se completa el roadmap del MVP (Fases 0 a 6). Queda para la fase de Expansión: formatos reales de terceros (Tango/Bejerman/SAP/Calipso, cuando haya muestras reales disponibles), distribución al empleado, integraciones API, OCR/IA, archivo legal certificado, y el pivote a plataforma completa — todo fuera del alcance de esta fase. También sigue pendiente, de fases anteriores: frontend (todo el backend hasta acá es solo API), revisión legal de T&C/DPA, y Docker Compose sin probar de punta a punta.

## [Unreleased] — Ajustes de diseño: apariencia institucional y jerarquía visual del Anexo III

### Cambiado
- **Márgenes de página por eje**: `MARGEN_PAGINA_MM` (12mm uniforme) se reemplaza por `MARGEN_VERTICAL_MM` (10mm) y `MARGEN_LATERAL_MM` (8mm) en `dimensiones-pagina.ts` — más ancho útil sin achicar tanto el respiro vertical.
- **Espaciado compactado**: menos margen/padding entre encabezados de sección, ficha, destacados, resumen de composición y pie de página — documento más denso sin tocar el tamaño de fuente base.
- **Ficha de identificación como grilla real**: pasa de `flexbox` con wrap a `display:grid`, así todos los campos comparten las mismas columnas entre filas (con flex, cada fila envolvía de forma independiente y los campos no quedaban necesariamente alineados).
- **Columnas de la tabla de conceptos consistentes entre las tres tablas del recibo** (contribuciones, remunerativo, deducciones): `table-layout:fixed` + un `<colgroup>` con anchos porcentuales fijos e idénticos en las tres, en vez de que cada `<table>` autocalcule su propio ancho de columna (lo que hacía que los bordes no coincidieran entre tablas apiladas, aunque cada una estuviera prolija puertas adentro). Columna Concepto con `word-break:break-word` como salvaguarda para nombres muy largos.
- **Dos niveles de énfasis para subtotal/total**: barra sólida gris cálido para subtotales, barra sólida oscura con texto claro para totales — reemplaza los fondos apenas perceptibles anteriores.
- **Gráfico de torta con menor protagonismo**: tamaño reducido (70px→52px), contenedor con ancho máximo acotado y menor proporción relativa frente al detalle de composición salarial (que ya trae los mismos números en texto) — pasa a leerse como complemento, no como competencia del contenido principal.
- **Apariencia institucional, no "dashboard"**: se quitan las esquinas redondeadas de los bloques destacados y el tinte celeste de "Sueldo neto" (ahora gris cálido neutro, misma familia que el resto de la plantilla).
- **Jerarquía visual de "Costo laboral total"**: nueva variante con el mismo tratamiento de barra oscura que los totales de tabla y fuente más grande — antes usaba el mismo tratamiento tenue que "Sueldo bruto" y quedaba diluido; ahora se lee como el número ancla de la sección de contribuciones, igual que en el modelo oficial (sin cambiar su posición, que ya era la correcta).
- Tests unitarios (Vitest) nuevos en `plantilla-recibo.spec.ts`: grilla real de la ficha, `colgroup`/`table-layout:fixed` consistente entre las tres tablas, `word-break` en la columna Concepto, barras de subtotal/total, jerarquía de "Costo laboral total" (5 tests nuevos).

### Verificado end-to-end (contra el backend real en ejecución)
Se anuló y reemitió los 3 recibos de prueba de "Comercial Anexo III Demo SA" (Carlos — 1 concepto por sección, caso más simple; Juan — densidad media; Ana — 30 conceptos y 7 categorías, el caso más denso disponible) y se inspeccionaron visualmente los tres PDF resultantes: grilla de identificación alineada como bloque único, columnas de las tres tablas coincidiendo entre sí, barras de subtotal/total claramente diferenciadas, "Costo laboral total" con jerarquía notoriamente mayor que "Sueldo bruto", gráfico más chico y discreto, sin bordes redondeados ni celeste — en los tres casos, sin romper la garantía de una sola página (ADR-047).

### Pendiente (fuera de esta tarea)
- El ajuste fino final contra la referencia oficial exacta (colores/pesos precisos de las barras) puede necesitar una iteración más una vez que el usuario compare el PDF regenerado con su imagen de referencia — no se tuvo acceso a esa imagen en esta tarea (ver ADR-051).
- Todo lo demás ya documentado en las fases anteriores (Fase 6, frontend, revisión legal de T&C/DPA, wrap de la leyenda del gráfico).

## [Unreleased] — Ajustes de plantilla: grilla, centrado, encabezados sin numerar y nomenclatura de archivo

### Agregado
- **Nomenclatura uniforme y automática de archivo**: nueva función de dominio `nombreArchivoRecibo()` arma siempre `Recibo - Apellido Nombre - Período.pdf` (ej. `Recibo - Pérez Juan - Junio 2026.pdf`) a partir del snapshot inmutable del recibo. Se usa con el mismo criterio en la descarga individual y en cada entrada del ZIP de lote — se eliminó el formato distinto que el ZIP usaba antes (`recibo-<numero>-<apellido>-<nombre>.pdf`). Nuevo `construirContentDisposition()` (utilidad transversal, no de dominio) arma el header `Content-Disposition` con `filename` ASCII (compatibilidad) + `filename*` UTF-8 (RFC 6266, tildes/ñ correctas en clientes modernos).
- **Desambiguación de colisiones en el ZIP de lote**: si dos empleados vigentes de la misma importación comparten apellido y nombre, `DescargarLoteRecibosUseCase` agrega un sufijo `" (2)"`, `" (3)"`... solo ante esa colisión real, para que ningún PDF se pierda al extraer el ZIP (el criterio base de nomenclatura nunca cambia). Detectado en la revisión de este cambio, no pedido explícitamente — ver ADR-050.
- Tests unitarios (Vitest): `construirContentDisposition` (4), `nombreArchivoRecibo` (4), 2 tests nuevos de `DescargarLoteRecibosUseCase` (nomenclatura + desambiguación), 2 tests nuevos de `plantilla-recibo.spec.ts` (sin numeración en encabezados, grilla/centrado presentes en el CSS).

### Cambiado
- **Columnas numéricas centradas**: toda celda de Unidad/Base/Monto (encabezado y dato) centra su contenido (`text-align: center`), en vez de quedar alineada a la izquierda o a la derecha. El encabezado de la tabla de conceptos ahora se muestra siempre (antes se omitía cuando no había columnas de auditoría de cálculo), para que Monto también tenga su título centrado.
- **Grilla completa en las tablas de detalle**: toda celda de `tabla-conceptos` (contribuciones, remunerativo, deducciones) tiene borde vertical y horizontal, replicando el modelo oficial de referencia — antes solo los subtotales/totales tenían un borde superior parcial.
- **Encabezados de sección sin numeración**: se quitó el prefijo "N. " de los cuatro `<h2>` (Identificación, Contribuciones del empleador, Remuneración bruta y deducciones, Remuneración neta) — quedan solo los nombres reales del Anexo III, igual que ya regía para los campos de la ficha de identificación.

### Verificado end-to-end (contra el backend real en ejecución, sin reiniciar Postgres)
Se anuló y reemitió los 3 recibos de prueba de la empresa "Comercial Anexo III Demo SA" (Juan Pérez, Ana Gómez — 30 conceptos y 7 categorías de contribución, el caso más denso disponible — y Carlos Rodríguez) para que el PDF se regenere con el código actual → **descarga individual**: header `Content-Disposition: attachment; filename="Recibo - Rodriguez Carlos - Agosto 2026.pdf"; filename*=UTF-8''Recibo%20-%20Rodr%C3%ADguez%20Carlos%20-%20Agosto%202026.pdf` (ASCII sin tilde + UTF-8 completo) → **ZIP de lote**: las 3 entradas se llaman exactamente `Recibo - Gómez Ana - Agosto 2026.pdf`, `Recibo - Pérez Juan - Agosto 2026.pdf`, `Recibo - Rodríguez Carlos - Agosto 2026.pdf` → inspección visual de los PDF de Carlos (1 concepto) y Ana (30 conceptos, 7 subtotales) confirma grilla completa, columnas centradas y encabezados sin numerar en ambos extremos de densidad de datos, sin romper la garantía de una sola página (ADR-047).

### Pendiente (fuera de esta tarea)
- Todo lo demás ya documentado en las fases anteriores (Fase 6, frontend, revisión legal de T&C/DPA, wrap de la leyenda del gráfico).

## [Unreleased] — Rediseño de la plantilla del recibo (fidelidad visual + garantía de una página)

### Agregado
- **Rediseño completo de `plantilla-recibo.ts`** con referencia a una plantilla oficial provista por el usuario: encabezado con razón social/domicilio/CUIT, ficha de identificación como bloques fluidos "etiqueta arriba, valor abajo" (Período, Legajo, Apellido y nombre, CUIL, Categoría, Fecha de ingreso, Antigüedad, Lugar y fecha de pago, Pago de cargas sociales), "Costo laboral total" y "Sueldo bruto" destacados antes de sus tablas, resumen de composición salarial (Remunerativo/No remunerativo/Descuentos), "Sueldo neto" destacado grande, y nueva sección "Detalle de la composición salarial" (cruce Empleador/Trabajador por categoría) con el gráfico de torta compacto al lado. Ninguna sección ni campo sin datos reserva espacio (se omite el bloque entero, no un placeholder "Sin X").
- **Garantía de una sola hoja A4, sin excepciones**: `PuppeteerGeneradorPdf` mide la altura real renderizada y, si excede el alto útil de la página, aplica un factor de escala uniforme (`page.pdf({ scale })`) con piso mínimo de legibilidad (70%). Validado con un spike previo (hasta 60 filas de prueba entra a ~78% de escala). Dimensiones de página centralizadas en `dimensiones-pagina.ts`. Ver ADR-047.
- **Columnas de auditoría de cálculo (Unidad/Base)**: el CSV de importación admite dos columnas opcionales nuevas por fila (informativas, nunca validadas contra el monto); se muestran en la tabla del recibo solo si algún concepto las trae. Ver ADR-048.
- **Legajo** del empleado (campo opcional, mismo patrón que categoría/fecha de ingreso de Fase 4).
- **Detalle Empleador/Trabajador por categoría**: `ClasificacionConcepto` admite `categoriaContribucion` opcional también en deducciones (no solo en contribución patronal); nueva función `construirDetalleComposicionSalarial()` cruza, por categoría y en el orden fijo del Anexo III, cuánto puso el empleador contra cuánto se le retuvo al trabajador. Ver ADR-049.
- Tests unitarios (Vitest): `construirDetalleComposicionSalarial` (8), `validarFilaImportacion` con unidad/base (4), `ActualizarEmpleadoUseCase` con legajo (1), `ClasificacionConcepto` con deducciones clasificadas (3), y la suite de `plantilla-recibo.spec.ts` reescrita para las nuevas columnas/campos/detalle (12 tests).

### Corregido
- **Bug de duplicación de filas, detectado por la verificación end-to-end (no por los tests unitarios):** la sección de contribuciones patronales mostraba cada concepto dos veces — una vez sin agrupar y otra vez agrupado con subtotal — porque la función que arma la tabla recibía tanto la lista cruda de conceptos como el HTML ya agrupado. Se unificó en una sola función (`envolverTabla`) que siempre recibe filas ya renderizadas, nunca vuelve a recorrer los conceptos. Se agregó un test de regresión que cuenta ocurrencias de un concepto en el HTML final.
- La leyenda del gráfico de torta cortaba el texto con etiquetas largas (`white-space: nowrap` sin ancho garantizado) — corregido permitiendo que la leyenda haga wrap dentro de su contenedor. Ajuste fino de layout pendiente, ver DECISIONS.md.
- `page.evaluate()` para medir la altura del documento no puede tipar `document` sin sumar la lib DOM a todo el proyecto backend — resuelto pasando el código como string en vez de función (Puppeteer lo ejecuta en el navegador, no en Node).

### Verificado end-to-end (contra PostgreSQL real, sin Docker)
Empresa con 3 empleados y CSV con `unidad`/`base` poblados (17, 30 y 4 filas de conceptos respectivamente, con montos y categorías reales de un recibo de Comercio) → los 3 recibos generados entran en **una sola página cada uno** (el de más filas, a ~escala reducida automáticamente) → tabla de contribuciones agrupada por categoría en el orden fijo del Anexo III, sin duplicar filas (tras el fix) → columnas Unidad/Base visibles y correctas → "Detalle de la composición salarial" cruza Empleador/Trabajador por categoría, mostrando solo los lados con datos → legajo visible en la ficha → caso mínimo (4 conceptos) sin secciones vacías ni espacio desperdiciado, a escala 100%.

### Pendiente (fuera de esta fase)
- Prolijar el wrap de la leyenda del gráfico de torta cuando hay muchas categorías con etiquetas largas simultáneamente (no pierde información, ver DECISIONS.md).
- Todo lo demás ya documentado como pendiente en las fases anteriores (Fase 6, frontend, revisión legal de T&C/DPA).

## [Unreleased] — Corrección: plantilla del recibo con conceptos reales del Anexo III (Comercio)

### Corregido
- **Etiquetas y orden de los subtotales de la sección 2 (Contribuciones del empleador):** mostraban el valor crudo del enum de categoría (`Subtotal seguridad_social`, `Subtotal obra_social`, `Subtotal camaras_empresariales`) en vez de una etiqueta legible en español, y se agrupaban en el orden de aparición del archivo de origen en vez del orden fijo del Anexo III. Con Fase 4 (que solo había probado la categoría "sindical", coincidente con su nombre en español) esto no se notaba. Se detectó recién al generar recibos con el set completo de conceptos reales de un recibo de Comercio (ART+FFEP, Contribución Jubilación/SIPA, Contribución Obra Social, Seguro de Vida Obligatorio, Contribución OSECAC, Contribución INACAP, Seguro de Retiro, Seguro de Vida CCT 130/75), tomados del Excel de referencia `Recibo_sueldo_anexo_III_decreto_407_art_140.xlsx` (ver memoria `referencia-conceptos-anexo-iii`). Corregido reutilizando `CATEGORIAS_CONTRIBUCION_ORDEN` (ya existente para el gráfico de torta desde ADR-039) también en la tabla de la sección 2, para que ambas vistas sean consistentes entre sí. Test de regresión agregado en `plantilla-recibo.spec.ts` (etiqueta legible + orden fijo con categorías fuera de orden en el snapshot de entrada).

## [Unreleased] — Fase 5: repositorio técnico (versionado, historial, descarga por lote)

### Agregado
- **Versionado de recibos:** `Recibo` gana `estado` (`vigente | anulado`), `motivoAnulacion` y `reemplazaAId`. `POST .../recibos/:id/anular` (motivo obligatorio) + `POST .../recibos/:id/reemitir` (solo sobre un recibo anulado, sin reemplazo previo) — la reemisión reconstruye el snapshot con los datos **vigentes** de Empresa/Empleado (no los originales), vía un builder de snapshot ahora compartido con la emisión (`construirSnapshotRecibo`, ver ADR-041). Vuelve a correr la Validación antes de reemitir. Ver ADR-040 a 042.
- **Historial de empresa:** `GET /empresas/:id/recibos` — todos los recibos de la empresa cruzando importaciones (vigentes y anulados), con filtro opcional `?empleadoId=`. `GET .../importaciones/:id/recibos` (Fase 4) ahora filtra vigentes por defecto, con `?incluirAnulados=true` para ver el historial de ese período puntual. Ver ADR-043.
- **Descarga por lote:** `GET .../importaciones/:id/recibos/descargar-lote` — ZIP (vía `archiver`) con los PDF vigentes de una importación. Ver ADR-044.
- **Deslinde contractual:** registro (`POST /auth/register`) exige `aceptaTerminos: true`; `Usuario.aceptoTerminosEn` guarda el momento de aceptación. Primer borrador de `docs/legal/terminos-y-condiciones.md` y `docs/legal/acuerdo-tratamiento-datos.md` (marcados explícitamente como borrador sin validez legal, pendientes de revisión profesional). Ver ADR-045.
- Tests unitarios (Vitest): `AnularReciboUseCase` (4), `ReemitirReciboUseCase` (5), `ListarRecibosUseCase` actualizado (2), `ListarHistorialRecibosEmpresaUseCase` (3), `DescargarLoteRecibosUseCase` (3), registro con aceptación de términos (1 nuevo) — tests nuevos o actualizados en esta fase.

### Corregido
- **Bug de inmutabilidad detectado por la verificación end-to-end (no por los tests):** el almacenamiento de PDF de Fase 4 usaba la ruta `uploads/recibos/<empresaId>/<importacionId>/<empleadoId>.pdf` — basada en el empleado, no en el recibo. Como Fase 5 permite que un empleado tenga más de un recibo en la misma importación (uno anulado + su reemplazo), el PDF del reemplazo **sobrescribía en disco** el del recibo anulado: descargar el anulado devolvía bytes que ya no coincidían con su `hashIntegridad`, rompiendo su inmutabilidad. Los tests unitarios no lo detectaban porque el `AlmacenamientoRecibos` fake no modela colisión de rutas. Se agregó el `numero` (correlativo único por empresa) a la ruta (`<empleadoId>-<numero>.pdf`) y una aserción de regresión en el test de reemisión. Ver ADR-046.
- Prisma 5.22 no soporta índices únicos parciales en el DSL del schema (confirmado con `prisma validate`, error P1012) — el `@@unique([importacionId, empleadoId])` de Fase 4 se reemplazó por un `@@index` simple; el invariante "a lo sumo un vigente por empleado+importación" pasa a controlarse en la capa de aplicación (ver ADR-040).
- `archiver@8` resultó ser **ESM puro** (`"type": "module"`) y con API distinta (`new ZipArchive()` en vez del factory `archiver('zip')`) — incompatible con el backend CommonJS; el `tsc` lo marcó ("no call signatures"), no el build de Vitest. Se bajó a `archiver@7` (última línea CommonJS estable) con `@types/archiver@6`.
- Al extender `EmpleadoRepository`/`ImportacionRepository` (Fase 4) y ahora `UsuarioRepository`/`ReciboRepository`, varios fakes de test quedaban con firmas desactualizadas — mismo problema estructural que en Fase 4 (invisible para Vitest, real para `tsc`); se revisaron y completaron todos con el chequeo `tsc -p tsconfig.eslint.json --rootDir .`.

### Verificado end-to-end (contra PostgreSQL real, sin Docker)
Registro rechazado sin aceptar los términos (400, "aceptaTerminos: Required") → registro aceptado con `aceptaTerminos:true` (guarda `aceptoTerminosEn`) → flujo completo hasta emitir 2 recibos → **anular** rechazado sin motivo (400) y aceptado con motivo (pasa a `anulado`, guarda el texto) → re-anular el ya anulado rechazado (400) → **reemitir** genera un recibo nuevo vigente enlazado por `reemplazaAId`, con hash distinto y **PDF real que refleja la ficha actualizada del empleado** (categoría/antigüedad recalculadas) → reemitir el ya reemplazado rechazado (400, "ya fue reemitido") → reemitir un vigente rechazado (400, "solo anulado") → listar por importación devuelve solo vigentes por defecto y los 3 con `?incluirAnulados=true` → historial de empresa cruza importaciones (todos, ordenados por fecha) y filtra por empleado → **descarga ZIP** (`archiver`) con solo los PDF vigentes, nombres con tildes correctas (`recibo-2-Gómez-Ana.pdf`) → aislamiento multi-tenant: un segundo usuario recibe 404 en anular, reemitir, historial y descarga-lote → **inmutabilidad verificada tras el fix**: se emite, anula y reemite un recibo, y el PDF del anulado descargado *después* de reemitir sigue coincidiendo byte-a-byte con su hash de emisión original (no fue pisado por el reemplazo).

### Pendiente (fuera de esta fase)
- Fase 6 (robustez de conectores): más formatos nativos de ingesta, tolerancia a errores de import, reportes de importación.
- Revisión legal profesional de los documentos de deslinde antes de cualquier uso comercial (ver ADR-045).
- UI de frontend para anulación/reemisión/historial (todas las fases hasta ahora son solo backend).
- RBAC/roles por empresa — quién puede anular/reemitir además del dueño de la empresa (diferido a la fase de Expansión, sin multi-usuario por empresa todavía).

## [Unreleased] — Fase 4: emisión (recibo inmutable + PDF Anexo III)

### Agregado
- Módulo `emision`: pipeline completo de emisión de recibos — `ReciboSnapshot` (foto autocontenida de empresa/empleado/período/conceptos/totales/gráfico, nunca se vuelve a leer en vivo), entidad `Recibo` (inmutable, numeración correlativa por empresa), plantilla HTML del Anexo III (4 secciones + gráfico de torta) renderizada a PDF con **Puppeteer**.
- Gráfico de torta (composición del costo laboral total) como SVG puro (`<circle>` + `stroke-dasharray`), sin librería de charting; paleta de 8 colores (remuneración + 7 categorías de contribución patronal) validada como CVD-safe con la skill de dataviz — ver ADR-039.
- `Empleado` se extiende con `categoria` y `fechaIngreso` (`PATCH /empresas/:id/empleados/:id`); `calcularAntiguedad()` deriva el texto ("2 años y 6 meses") a partir de la fecha de ingreso.
- `Importacion` se extiende con los 4 datos de cabecera de emisión (fecha/lugar de pago, fecha/lugar de pago de cargas sociales) vía endpoint propio (`PATCH /empresas/:id/importaciones/:id/datos-emision`) — ver ADR-033.
- `POST /empresas/:id/importaciones/:id/recibos/emitir` — emite en lote los recibos de **todos** los empleados de la importación (ver ADR-034): valida ownership, estado `confirmada`, datos de emisión completos, que no haya recibos previos (ver ADR-035) y que la Validación (Fase 3) dé `puedeEmitirse: true`; genera snapshot + PDF + hash SHA-256 por empleado.
- `GET .../recibos` (lista metadata) y `GET .../recibos/:id/descargar` (descarga el PDF, `StreamableFile`).
- Modelo Prisma `Recibo` (`snapshot` como `Json`, `hashIntegridad`, `pdfPath`, único por `importacionId`+`empleadoId`) y migración (`backend/prisma/migrations/20260717221826_fase4_emision_recibos/`).
- Almacenamiento del PDF en filesystem local detrás de un puerto de dominio (`AlmacenamientoRecibos`, ver ADR-038), estructura `uploads/recibos/<empresaId>/<importacionId>/<empleadoId>.pdf` (gitignored).
- Tests unitarios (Vitest): `calcularAntiguedad` (7), `construirSegmentosCostoLaboral` (7), `generarHtmlRecibo`/plantilla (6, incluye verificación de escapado de HTML), `EmitirRecibosUseCase` con fakes (9, incluye las 3 reglas de bloqueo y numeración correlativa), `ActualizarEmpleadoUseCase` (3), `ActualizarDatosEmisionUseCase` (4) — 36 tests nuevos.

### Corregido
- Al extender `EmpleadoRepository`/`ImportacionRepository` con los métodos nuevos (`findByIdAndEmpresa`/`actualizar`, `actualizarDatosEmision`), los fakes de test ya existentes (`confirmar-importacion.use-case.spec.ts`, `definir-mapeo-concepto.use-case.spec.ts`, `validar-importacion.use-case.spec.ts`) quedaron incompletos frente a la interfaz — invisible para Vitest (transpila con esbuild, sin chequeo de tipos) pero un error real de `tsc` (`TS2420`, confirmado corriendo `tsc` sobre `test/` con `rootDir` ampliado). Se completaron los fakes faltantes.
- `puppeteer@25`: `page.setContent()` ya no acepta `networkidle0`/`networkidle2` como `waitUntil` (solo `load`/`domcontentloaded`); como el HTML del recibo es autocontenido (sin recursos externos), se usa `domcontentloaded`.

### Verificado end-to-end (contra PostgreSQL real, sin Docker)
Importar y confirmar un CSV con 2 empleados (sueldo básico + aporte sindical cada uno) → mapear ambos conceptos → cargar categoría/fecha de ingreso de un empleado → completar los 4 datos de emisión → `GET .../validacion` da `puedeEmitirse: true` → **emitir genera 2 PDFs reales** (verificados abriendo el archivo: 4 secciones, gráfico de torta con porcentajes correctos, acentos renderizados bien, antigüedad "2 años y 6 meses", montos en formato `es-AR`) → **re-emitir la misma importación rechazado** (400) → importación confirmada sin datos de emisión → emitir rechazado (400) → importación confirmada con un concepto sin mapear → emitir rechazado por validación (400) → **inmutabilidad**: se cambia la categoría/fecha de ingreso del empleado *después* de emitido → se vuelve a leer el snapshot persistido y a descargar el PDF → ambos exactamente iguales a los originales (mismo hash, mismo contenido byte a byte) → segunda importación de la misma empresa emitida después → numeración correlativa correcta (3, 4 siguiendo a 1, 2) → segundo usuario no puede listar, descargar ni emitir recibos de la empresa ajena (404).

### Pendiente (fuera de esta fase)
- Fase 5 (Repositorio técnico): historial, versionado (anulación + reemisión, ver ADR-035), descargas por lote, T&C/DPA de deslinde.
- UI de emisión en el frontend (esta fase es solo backend).
- Docker sigue sin probarse de punta a punta (pendiente, decisión explícita del usuario — ver Fase 0).

## [Unreleased] — Mantenimiento

### Corregido
- `backend/tsconfig.json`: `moduleResolution: "node"` (alias interno "node10") y `baseUrl` están deprecados por TypeScript, dejan de funcionar en TS 7.0. Se migró a `module`/`moduleResolution: "nodenext"` (el reemplazo oficial recomendado para proyectos Node/CommonJS) y se eliminó `baseUrl` (no se usaba: todos los imports del proyecto son relativos, verificado antes de sacarlo). Sin cambios de comportamiento: build, lint, los 45 tests y el arranque en modo watch se re-verificaron después del cambio.

## [Unreleased] — Fase 3: validación (reglas de negocio Anexo III)

### Agregado
- Módulo `validacion` — **primera fase sin persistencia propia**: calcula todo al vuelo sobre `Importacion`/`ImportacionFila` ya existentes, nunca se guarda ni se audita (es de solo lectura).
- Por empleado dentro de una importación: `totalBruto` (remunerativo + no_remunerativo), `totalDeducciones`, `totalContribucionesPatronales`, `neto`, `costoLaboralTotal` — ignora filas sin clasificar en la suma (se reportan aparte).
- Reglas bloqueantes: hay conceptos sin clasificar (global); un empleado sin ningún concepto remunerativo; neto negativo.
- Advertencia (no bloqueante): el neto de un empleado varía más de un 30% respecto de su importación *confirmada* comparable más reciente (busca hacia atrás hasta encontrar una donde ese empleado esté 100% clasificado).
- `Importacion.agruparFilasPorCuilValido()` y `ImportacionRepository.findConfirmadasAnteriores()` (nuevos, en el módulo Importación).
- Endpoint nuevo: `GET /empresas/:id/importaciones/:id/validacion`.
- Tests unitarios (Vitest): `calcularTotalesEmpleado` (3), `evaluarReglasEmpleado` (6), `ValidarImportacionUseCase` con fakes (7) — 16 tests nuevos.

### Verificado end-to-end (contra PostgreSQL real, con datos reales de sesiones anteriores)
Importación con un concepto sin mapear → `puedeEmitirse: false`, bruto calculado solo con lo clasificado → se mapea el concepto pendiente → la misma importación pasa a `puedeEmitirse: true` con el bruto ya completo → se importa y confirma un período nuevo con un salto grande de sueldo para el mismo empleado → la validación detecta y reporta la advertencia con el porcentaje exacto de variación calculado contra el período anterior → segundo usuario no puede validar la importación ajena (404) → importación inexistente (404) → sin token (401).

### Pendiente (fuera de esta fase)
- Fase 4+ (emisión del PDF conforme al Anexo III, con el gráfico de torta).
- Campos de cabecera del art. 140 (categoría del empleado, fecha de ingreso, fecha/lugar de pago) — se agregan cuando el modelo se expanda para la emisión, no antes.
- UI de validación en el frontend (esta fase es solo backend).

## [Unreleased] — Fase 0: fundaciones técnicas

### Agregado
- Monorepo `backend/` (NestJS + TypeScript, Modular Monolith + Clean Architecture) y `frontend/` (React + Vite).
- Auth: registro y login con JWT + argon2, guard de autenticación.
- Módulos `empresas` y `empleados`, con scoping multi-tenant (`usuarioId` → `empresaId`) y autorización por ownership.
- Value objects de dominio: `Cuit`, `Cuil` (validación de dígito verificador, algoritmo módulo 11 compartido), `Money` (aritmética en centavos, sin punto flotante).
- Infraestructura transversal: `PrismaService`, configuración validada con Zod (`env.schema.ts`), logging estructurado (pino), interceptor de auditoría (`AuditInterceptor` + `@Auditable`), filtro global de errores de dominio.
- Prisma schema inicial: `Usuario`, `Empresa`, `Empleado`, `AuditLog` (append-only).
- Health check (`GET /api/health`).
- Tests unitarios (Vitest): value objects y casos de uso de auth — 16 tests.
- Docker: `Dockerfile` multi-stage para backend y frontend, `docker-compose.yml` (Postgres + backend + frontend).
- Frontend: página de login mínima conectada a la API.
- Migración inicial de Prisma (`backend/prisma/migrations/20260717180427_init/`), generada y aplicada contra una instancia real de PostgreSQL (verificación local con `embedded-postgres`, sin depender de Docker).

### Corregido
- `tsconfig.json`: `incremental: true` sin `tsBuildInfoFile` dejaba el cache de build (`tsconfig.tsbuildinfo`) fuera de `dist/`; al borrar `dist/` sin borrar el cache, `tsc`/`nest build` reportaban éxito sin volver a emitir nada. Se fijó `tsBuildInfoFile: "./dist/tsconfig.tsbuildinfo"` para que ambos queden sincronizados.
- `AuthController`, `EmpresaController`, `EmpleadoController`: `@UsePipes()` a nivel de método aplicaba el `ZodValidationPipe` a **todos** los parámetros del handler, no solo a `@Body()` — rompía cualquier endpoint autenticado con un segundo parámetro (`@CurrentUser()`), devolviendo siempre "Required" para los campos del body. Se movió el pipe al parámetro (`@Body(new ZodValidationPipe(schema))`).
- `.eslintrc.json`: `parserOptions.project` apuntaba a `tsconfig.json`, que excluye `test/`, así que `npm run lint` fallaba siempre al lintear los specs. Se agregó `tsconfig.eslint.json` (incluye `src/` y `test/`) y se referenció desde ESLint.

### Verificado end-to-end (contra PostgreSQL real, sin Docker)
Registro → login → crear empresa (con validación de CUIT y aislamiento por usuario) → crear empleado (con validación de CUIL) → listar → verificación de que un segundo usuario no ve los datos del primero (404) → confirmación de que `AuditLog` registra cada alta.

### Pendiente (fuera de esta fase)
- `docker-compose.yml` en sí (orquestación completa) no se probó de punta a punta: no hay Docker instalado en el entorno donde se desarrolló este proyecto. Decisión explícita del usuario: se prueba más adelante, no se instaló Docker Desktop para esto. Los Dockerfiles y la migración se verificaron por separado.
- Fases 2+ del roadmap (mapeo, validación, emisión de recibos) — ver documentación de roadmap fuera de este repositorio.

## [Unreleased] — Fase 1: ingesta (conector CSV → modelo canónico)

### Agregado
- Módulo `importacion` (domain/application/infrastructure/presentation, mismo patrón que Fase 0): conector CSV (`csv-parse`), validación de fila (formato largo: CUIL/nombre/apellido/concepto/monto, reutiliza `Cuil` y `Money`), entidades `Importacion` e `ImportacionFila`.
- Flujo de dos pasos: `POST /empresas/:id/importaciones` (sube el archivo, parsea, persiste como `previsualizada`, nunca crea Empleados todavía) → `POST /empresas/:id/importaciones/:id/confirmar` (bloquea si hay filas con error; si no, crea/matchea Empleados por CUIL y pasa a `confirmada`). `GET /empresas/:id/importaciones/:id` para releer el preview.
- `EmpleadoRepository.findByCuilAndEmpresa` (nuevo método, usado por la confirmación para no duplicar empleados).
- Migración de Prisma (`backend/prisma/migrations/20260717185323_importacion/`), generada y aplicada contra PostgreSQL real.
- Tests unitarios (Vitest): validador de fila (7), conector CSV (4), caso de uso de confirmación con fakes (5) — 16 tests nuevos.

### Corregido
- `AuditInterceptor`/`@Auditable`: la acción se inferia únicamente del método HTTP, así que `POST .../confirmar` quedaba registrado como `"crear"` en el `AuditLog` — engañoso para un log cuyo propósito es trazabilidad exacta. Se agregó un segundo parámetro opcional (`@Auditable('Importacion', 'confirmar')`) para indicar la acción explícitamente cuando no coincide con la inferida por método; sin ese parámetro se mantiene el comportamiento anterior (compatible con los usos de Fase 0).

### Verificado end-to-end (contra PostgreSQL real, sin Docker)
Importar un CSV con una fila de CUIL inválido → preview muestra 2 válidas/1 con error → confirmar rechazado (400, "hay filas con errores") → importar un CSV limpio con un empleado repetido en dos filas → confirmar → se crean exactamente los empleados únicos (sin duplicar) → re-confirmar rechazado (400, ya confirmada) → segundo usuario no puede ver la importación ajena (404) → `AuditLog` muestra `['crear', 'confirmar']` para el ciclo completo de una importación.

### Pendiente (fuera de esta fase)
- Fase 2+ (mapeo de conceptos a categorías normativas, validación Anexo III, emisión).
- Conector Excel (.xlsx): mismo patrón de conector, no implementado todavía (solo CSV en esta fase).
- UI de importación en el frontend (esta fase es solo backend, igual que Fase 0 con empresas/empleados).

## [Unreleased] — Herramientas de desarrollo

### Agregado
- `embedded-postgres` como devDependency real (antes se instalaba y desinstalaba `--no-save` solo para verificación puntual): PostgreSQL real sin Docker para desarrollo local persistente. Script `backend/scripts/dev-db.mjs` (`npm run db:dev`), datos en `backend/.dev-db-data/` (gitignored).
- Documentado en `README.md`, sección "Desarrollo local (sin Docker)".

### Corregido
- `scripts/dev-db.mjs`: `initdb` tomaba el locale del sistema operativo (Windows en español) y creaba la base con encoding **WIN1252** en vez de **UTF8** — inaceptable para una app en español (cualquier tilde/ñ podía fallar al guardarse, como pasó al probar Fase 2). Se agregó `initdbFlags: ['--encoding=UTF8', '--locale=C']` para forzarlo explícitamente. Detectado recreando el entorno local desde cero, no en el código de la aplicación en sí (que maneja UTF-8 correctamente una vez la base lo soporta).

## [Unreleased] — Fase 2: motor de mapeo (conceptos → categorías normativas)

### Agregado
- Value object `ClasificacionConcepto` en `shared/` (tipo `remunerativo | no_remunerativo | deduccion | contribucion_patronal` + las 7 categorías de contribución patronal del Anexo III cuando corresponde) — nunca representable en combinación inválida.
- Módulo `mapeo`: entidad `PerfilMapeoConcepto` (diccionario reutilizable por empresa: concepto → clasificación), casos de uso `definir-mapeo-concepto` (upsert + backfill retroactivo), `listar-mapeos`, `listar-conceptos-sin-mapear`.
- `ImportacionFila` se extiende con `clasificacion: ClasificacionConcepto | null` — nula hasta que el motor de mapeo la clasifica.
- `ConfirmarImportacionUseCase` (Fase 1, sin tocar su lógica de negocio existente) ahora también auto-clasifica: al confirmar, aplica el perfil de mapeo ya definido a los conceptos conocidos; los desconocidos quedan sin clasificar, sin bloquear la confirmación.
- Endpoints nuevos: `POST/GET /empresas/:id/conceptos-mapeados`, `GET /empresas/:id/conceptos-sin-mapear`.
- `forwardRef()` entre `ImportacionModule` y `MapeoModule` (dependencia mutua legítima: Importación consulta el mapeo al confirmar, Mapeo necesita las filas de Importación para el backfill) — ver DECISIONS.md.
- Migración de Prisma (`backend/prisma/migrations/20260717204148_mapeo_conceptos/`).
- Tests unitarios (Vitest): `ClasificacionConcepto` (7), `DefinirMapeoConceptoUseCase` con fakes (3), casos nuevos de auto-clasificación en `ConfirmarImportacionUseCase` (3) — 13 tests nuevos.

### Verificado end-to-end (contra PostgreSQL real, sin Docker)
Importar y confirmar un archivo con 2 conceptos sin mapear → ambos quedan sin clasificar, listados como pendientes → definir mapeo de uno (con tilde, vía archivo para evitar problemas de encoding del shell, no de la app) → se aplica retroactivamente a la fila ya confirmada (`filasActualizadas: 1`) y desaparece de "sin mapear" → importar y confirmar un segundo archivo con el mismo concepto → se clasifica solo, automáticamente, al confirmar → definir el mapeo de un concepto de contribución patronal (ART) → backfill sobre la importación ya confirmada → rechazo de combinación tipo/categoría inválida (400) → segundo usuario no puede listar ni definir mapeos de la empresa ajena (404) → `AuditLog` registra cada definición de mapeo.

### Pendiente (fuera de esta fase)
- Fase 3+ (reglas de validación Anexo III, emisión de recibos).
- UI de mapeo en el frontend (esta fase es solo backend).
