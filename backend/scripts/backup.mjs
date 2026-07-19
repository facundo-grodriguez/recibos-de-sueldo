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
import { PrismaClient } from '@prisma/client';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_BACKEND = path.join(__dirname, '..');
const DIRECTORIO_UPLOADS = path.join(RAIZ_BACKEND, 'uploads', 'recibos');

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
  const destino = process.argv[2] ?? path.join(RAIZ_BACKEND, 'backups', timestamp());
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
}

main().catch((error) => {
  console.error('Falló el backup:', error);
  process.exit(1);
});
