// Levanta una instancia local de PostgreSQL real (sin Docker) para desarrollo.
// No usar en producción: es un binario embebido pensado solo para el entorno
// de desarrollo de quien no tiene Docker disponible (ver README, sección
// "Desarrollo local sin Docker").
import EmbeddedPostgres from 'embedded-postgres';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '.dev-db-data');
const PORT = 5433;

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: 'recibos',
  password: 'recibos',
  port: PORT,
  persistent: true,
  // Sin esto, initdb toma el locale del sistema operativo (en Windows con
  // configuración regional en español, cae en WIN1252) y la base queda
  // incapaz de guardar texto con tildes/ñ — inaceptable para una app en
  // español. Forzamos UTF8 explícitamente; locale "C" evita además
  // sorpresas de collation dependientes del sistema operativo.
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

const yaInicializada = existeDirectorioConDatos(DATA_DIR);

if (!yaInicializada) {
  await pg.initialise();
}
await pg.start();
if (!yaInicializada) {
  await pg.createDatabase('recibos');
}

console.log(`Postgres local lista en localhost:${PORT} (db "recibos", user "recibos").`);
console.log(`DATABASE_URL="postgresql://recibos:recibos@localhost:${PORT}/recibos?schema=public"`);
console.log('Ctrl+C para detenerla.');

function existeDirectorioConDatos(dir) {
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

async function apagar() {
  await pg.stop();
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
