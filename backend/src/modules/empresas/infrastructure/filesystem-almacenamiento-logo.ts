import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { AlmacenamientoLogo, GuardarLogoParams } from '../domain/almacenamiento-logo';

const DIRECTORIO_BASE = resolve(process.cwd(), 'uploads', 'logos');

/** Un solo logo vigente por empresa (no se versiona, a diferencia de los recibos): un recibo ya
 * emitido no vuelve a leer este archivo, guarda su propio data URI congelado en el snapshot. */
@Injectable()
export class FilesystemAlmacenamientoLogo implements AlmacenamientoLogo {
  async guardar({ empresaId, extension, contenido }: GuardarLogoParams): Promise<string> {
    await mkdir(DIRECTORIO_BASE, { recursive: true });

    // Si ya había un logo con otra extensión, se borra — evita acumular archivos huérfanos
    // cada vez que alguien reemplaza el logo por un formato distinto.
    const existentes = await readdir(DIRECTORIO_BASE);
    await Promise.all(
      existentes
        .filter((nombre) => nombre.startsWith(`${empresaId}.`))
        .map((nombre) => unlink(resolve(DIRECTORIO_BASE, nombre)).catch(() => undefined)),
    );

    const nombreArchivo = `${empresaId}.${extension}`;
    await writeFile(resolve(DIRECTORIO_BASE, nombreArchivo), contenido);
    return nombreArchivo;
  }

  async leer(logoPath: string): Promise<Buffer> {
    return readFile(resolve(DIRECTORIO_BASE, logoPath));
  }
}
