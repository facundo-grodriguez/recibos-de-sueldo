import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { ALMACENAMIENTO_RECIBOS, AlmacenamientoRecibos } from '../domain/almacenamiento-recibos';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface DescargarReciboInput {
  importacionId: string;
  reciboId: string;
  empresaId: string;
  usuarioId: string;
}

export interface DescargarReciboResultado {
  recibo: Recibo;
  contenido: Buffer;
}

@Injectable()
export class DescargarReciboUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
    @Inject(ALMACENAMIENTO_RECIBOS) private readonly almacenamiento: AlmacenamientoRecibos,
  ) {}

  async execute(input: DescargarReciboInput): Promise<DescargarReciboResultado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const recibo = await this.reciboRepository.findByIdAndImportacion(input.reciboId, importacion.id);
    if (!recibo) {
      throw new NotFoundError(`Recibo "${input.reciboId}" no encontrado`);
    }

    const contenido = await this.almacenamiento.leer(recibo.pdfPath);
    return { recibo, contenido };
  }
}
