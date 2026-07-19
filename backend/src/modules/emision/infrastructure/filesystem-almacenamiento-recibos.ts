import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { AlmacenamientoRecibos, GuardarReciboParams } from '../domain/almacenamiento-recibos';

const DIRECTORIO_BASE = resolve(process.cwd(), 'uploads', 'recibos');

@Injectable()
export class FilesystemAlmacenamientoRecibos implements AlmacenamientoRecibos {
  async guardar({ empresaId, importacionId, empleadoId, numero, contenido }: GuardarReciboParams): Promise<string> {
    const rutaRelativa = join(empresaId, importacionId, `${empleadoId}-${numero}.pdf`);
    const rutaAbsoluta = resolve(DIRECTORIO_BASE, rutaRelativa);

    await mkdir(join(DIRECTORIO_BASE, empresaId, importacionId), { recursive: true });
    await writeFile(rutaAbsoluta, contenido);

    return normalize(rutaRelativa);
  }

  async leer(pdfPath: string): Promise<Buffer> {
    return readFile(resolve(DIRECTORIO_BASE, pdfPath));
  }
}
