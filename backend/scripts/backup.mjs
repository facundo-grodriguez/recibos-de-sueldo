// Backup lógico de la base (vía Prisma, sin depender de pg_dump — no está
// disponible en este entorno, ver README sección "Backups") + copia de los
// PDF ya emitidos (uploads/recibos/).
//
// Por qué hace falta copiar los PDF además de la base: el hash de
// integridad de cada recibo (Recibo.hashIntegridad, ADR-038) se calculó
// sobre los bytes exactos del PDF generado en el momento de emitir. La
// plantilla (plantilla-recibo.ts) cambia con el tiempo — ya cambió varias
// veces en esta sesión — así que volver a generar el PDF a partir del
// snapshot guardado en la base HOY casi seguro no reproduce los mismos
// bytes, y el hash dejaría de coincidir. El PDF original es el único lugar
// donde ese hash sigue siendo válido: no es reconstruible desde la base.
//
// Uso: node scripts/backup.mjs [directorio-destino]
// Por defecto guarda en backend/backups/<timestamp>/.
//
// Retención: después de cada backup exitoso, borra los más viejos y deja
// como máximo BACKUP_RETENTION_CANTIDAD (default 14) — sin esto, un backup
// diario corriendo sin supervisión llena el disco del servidor con el
// tiempo (mismo motivo que la rotación de logs de Docker, ver
// docker-compose.yml).
import { PrismaClient } from '@prisma/client';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_BACKEND = path.join(__dirname, '..');
const DIRECTORIO_UPLOADS = path.join(RAIZ_BACKEND, 'uploads', 'recibos');
const DIRECTORIO_BACKUPS = path.join(RAIZ_BACKEND, 'backups');
const RETENCION_CANTIDAD = Number(process.env.BACKUP_RETENTION_CANTIDAD ?? 14);

const TABLAS = [
  'usuario',
  'empresa',
  'empleado',
  'importacion',
  'importacionFila',
  'perfilMapeoConcepto',
  'recibo',
  'auditLog',
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const destinoExplicito = process.argv[2];
  const destino = destinoExplicito ?? path.join(DIRECTORIO_BACKUPS, timestamp());
  await mkdir(destino, { recursive: true });

  const prisma = new PrismaClient();
  const resumen = {};

  try {
    for (const tabla of TABLAS) {
      const registros = await prisma[tabla].findMany();
      await writeFile(
        path.join(destino, `${tabla}.json`),
        JSON.stringify(registros, null, 2),
      );
      resumen[tabla] = registros.length;
    }
  } finally {
    await prisma.$disconnect();
  }

  const destinoUploads = path.join(destino, 'uploads-recibos');
  if (existsSync(DIRECTORIO_UPLOADS)) {
    await cp(DIRECTORIO_UPLOADS, destinoUploads, { recursive: true });
  } else {
    await mkdir(destinoUploads, { recursive: true });
  }

  await writeFile(
    path.join(destino, 'manifiesto.json'),
    JSON.stringify({ generadoEn: new Date().toISOString(), registrosPorTabla: resumen }, null, 2),
  );

  console.log(`Backup completo en: ${destino}`);
  console.table(resumen);

  // Solo aplica retención sobre el directorio de backups por defecto — un
  // destino explícito (ej. una restauración de prueba a otra carpeta) nunca
  // se toca, sea cual sea su contenido.
  if (!destinoExplicito) {
    await aplicarRetencion();
  }
}

async function aplicarRetencion() {
  if (!existsSync(DIRECTORIO_BACKUPS)) return;

  const entradas = await readdir(DIRECTORIO_BACKUPS, { withFileTypes: true });
  const carpetas = entradas
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort(); // los nombres son timestamps ISO con formato fijo: orden lexicográfico == orden cronológico.

  const aBorrar = carpetas.slice(0, Math.max(0, carpetas.length - RETENCION_CANTIDAD));
  for (const carpeta of aBorrar) {
    await rm(path.join(DIRECTORIO_BACKUPS, carpeta), { recursive: true, force: true });
    console.log(`Retención: borrado backup viejo ${carpeta} (quedan los últimos ${RETENCION_CANTIDAD})`);
  }
}

main().catch((error) => {
  console.error('Falló el backup:', error);
  process.exit(1);
});
