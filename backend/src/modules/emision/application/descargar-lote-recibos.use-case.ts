import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { ALMACENAMIENTO_RECIBOS, AlmacenamientoRecibos } from '../domain/almacenamiento-recibos';
import { EMPAQUETADOR_ZIP, EmpaquetadorZip } from '../domain/empaquetador-zip';
import { nombreArchivoRecibo } from '../domain/nombre-archivo-recibo';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface DescargarLoteRecibosInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
}

export interface DescargarLoteRecibosResultado {
  contenido: Buffer;
  nombreArchivo: string;
}

/**
 * Mismo criterio de nomenclatura que la descarga individual (`nombreArchivoRecibo`)
 * para cada entrada del ZIP. Dos empleados pueden compartir apellido y nombre
 * dentro de la misma empresa y período: sin desambiguar, el ZIP tendría dos
 * entradas con el nombre idéntico y, según la herramienta de extracción usada,
 * una podría pisar a la otra. Por eso, solo ante una colisión real, se agrega
 * un sufijo numérico — el criterio de base nunca cambia.
 */
function nombresDeArchivoDesambiguados(recibos: Recibo[]): string[] {
  const ocurrenciasPorNombreBase = new Map<string, number>();
  return recibos.map((recibo) => {
    const nombreBase = nombreArchivoRecibo(recibo);
    const ocurrencia = (ocurrenciasPorNombreBase.get(nombreBase) ?? 0) + 1;
    ocurrenciasPorNombreBase.set(nombreBase, ocurrencia);
    return ocurrencia === 1 ? nombreBase : nombreBase.replace(/\.pdf$/, ` (${ocurrencia}).pdf`);
  });
}

@Injectable()
export class DescargarLoteRecibosUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
    @Inject(ALMACENAMIENTO_RECIBOS) private readonly almacenamiento: AlmacenamientoRecibos,
    @Inject(EMPAQUETADOR_ZIP) private readonly empaquetadorZip: EmpaquetadorZip,
  ) {}

  async execute(input: DescargarLoteRecibosInput): Promise<DescargarLoteRecibosResultado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const recibos = await this.reciboRepository.findVigentesByImportacion(importacion.id);
    if (recibos.length === 0) {
      throw new DomainError('No hay recibos vigentes en esta importación para descargar');
    }

    const nombresDeArchivo = nombresDeArchivoDesambiguados(recibos);
    const archivos = await Promise.all(
      recibos.map(async (recibo, indice) => ({
        nombre: nombresDeArchivo[indice],
        contenido: await this.almacenamiento.leer(recibo.pdfPath),
      })),
    );

    const contenido = await this.empaquetadorZip.crear(archivos);
    const mesFormateado = String(importacion.mes).padStart(2, '0');

    return { contenido, nombreArchivo: `recibos-${importacion.anio}-${mesFormateado}.zip` };
  }
}
