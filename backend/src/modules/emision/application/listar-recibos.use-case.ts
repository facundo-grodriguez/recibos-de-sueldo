import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface ListarRecibosInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
  /** Por defecto solo trae vigentes; true incluye también los anulados. */
  incluirAnulados?: boolean;
}

@Injectable()
export class ListarRecibosUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
  ) {}

  async execute(input: ListarRecibosInput): Promise<Recibo[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    return input.incluirAnulados
      ? this.reciboRepository.findAllByImportacion(importacion.id)
      : this.reciboRepository.findVigentesByImportacion(importacion.id);
  }
}
