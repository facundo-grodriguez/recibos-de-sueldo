import { PassThrough } from 'node:stream';
import { Injectable } from '@nestjs/common';
import archiver from 'archiver';
import { ArchivoParaEmpaquetar, EmpaquetadorZip } from '../domain/empaquetador-zip';

@Injectable()
export class ArchiverEmpaquetadorZip implements EmpaquetadorZip {
  async crear(archivos: ArchivoParaEmpaquetar[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const zip = archiver('zip', { zlib: { level: 9 } });
      const salida = new PassThrough();
      const chunks: Buffer[] = [];

      salida.on('data', (chunk: Buffer) => chunks.push(chunk));
      salida.on('end', () => resolve(Buffer.concat(chunks)));
      zip.on('error', (error: Error) => reject(error));

      zip.pipe(salida);
      for (const archivo of archivos) {
        zip.append(archivo.contenido, { name: archivo.nombre });
      }
      void zip.finalize();
    });
  }
}
