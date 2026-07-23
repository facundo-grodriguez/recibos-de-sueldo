// Procedimiento de reseteo de contraseña (Tarea 7 del plan de piloto): no
// hay pantalla de "olvidé mi contraseña" ni infraestructura de email en el
// backend (decisión explícita — ver README, sección "Seguridad"/"Cuentas
// de usuario"). Si el cliente olvida su clave, quien administra la
// instancia corre este script directamente en el servidor.
//
// Uso: node scripts/reset-password.mjs <email> <contraseña-nueva>
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const LARGO_MINIMO_PASSWORD = 8; // mismo mínimo que registerSchema (register.dto.ts)

async function main() {
  const [email, passwordNueva] = process.argv.slice(2);

  if (!email || !passwordNueva) {
    console.error('Uso: node scripts/reset-password.mjs <email> <contraseña-nueva>');
    process.exit(1);
  }

  if (passwordNueva.length < LARGO_MINIMO_PASSWORD) {
    console.error(`La contraseña nueva debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      console.error(`No existe ningún usuario con el email "${email}". No se cambió nada.`);
      process.exit(1);
    }

    const passwordHash = await argon2.hash(passwordNueva);
    await prisma.usuario.update({ where: { email }, data: { passwordHash } });

    console.log(`Contraseña actualizada para "${email}". Avisale al usuario que puede ingresar con la nueva.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Falló el reseteo de contraseña:', error);
  process.exit(1);
});
