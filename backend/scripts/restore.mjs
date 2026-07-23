// Restaura un backup generado por backup.mjs. Pensado para una instancia
// limpia: correr `npx prisma migrate deploy` primero (crea las tablas
// vacías) y recién después este script (carga los datos) — separado a
// propósito, para no mezclar "crear estructura" con "cargar datos" en un
// solo paso.
//
// Uso: node scripts/restore.mjs <directorio-backup>
//
// Orden de carga: respeta las FK del schema (usuario → empresa →
// empleado/importacion → importacionFila/perfilMapeoConcepto/recibo →
// auditLog) — insertar en otro orden falla con una violación de clave
// foránea, que es preferible a insertar "como se pueda" y terminar con
// datos huérfanos.
import { PrismaClient } from '@prisma/client';
import { cp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_BACKEND = path.join(__dirname, '..');
const DIRECTORIO_UPLOADS = path.join(RAIZ_BACKEND, 'uploads', 'recibos');

// Mismo orden que TABLAS en backup.mjs, pero es el que importa acá: define
// el orden real de inserción.
const TABLAS_EN_ORDEN = [
  'usuario',
  'empresa',
  'empleado',
  'importacion',
  'importacionFila',
  'perfilMapeoConcepto',
  'recibo',
  'auditLog',
];

async function main() {
  const origen = process.argv[2];
  if (!origen) {
    console.error('Uso: node scripts/restore.mjs <directorio-backup>');
    process.exit(1);
  }
  if (!existsSync(origen)) {
    console.error(`No existe el directorio de backup: ${origen}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const resumen = {};

  try {
    for (const tabla of TABLAS_EN_ORDEN) {
      const rutaJson = path.join(origen, `${tabla}.json`);
      if (!existsSync(rutaJson)) {
        console.warn(`Aviso: falta ${tabla}.json en el backup, se saltea (0 registros)`);
        resumen[tabla] = 0;
        continue;
      }

      const registros = JSON.parse(await readFile(rutaJson, 'utf-8'));
      if (registros.length > 0) {
        await prisma[tabla].createMany({ data: registros });
      }
      resumen[tabla] = registros.length;
    }
  } finally {
    await prisma.$disconnect();
  }

  const origenUploads = path.join(origen, 'uploads-recibos');
  if (existsSync(origenUploads)) {
    await cp(origenUploads, DIRECTORIO_UPLOADS, { recursive: true });
  } else {
    console.warn('Aviso: el backup no tenía uploads-recibos/ — no se restauró ningún PDF');
  }

  console.log(`Restauración completa desde: ${origen}`);
  console.table(resumen);
}

main().catch((error) => {
  console.error('Falló la restauración:', error);
  process.exit(1);
});
