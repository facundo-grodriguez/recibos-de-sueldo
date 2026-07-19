import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface AnularReciboInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  reciboId: string;
  motivo: string;
}

@Injectable()
export class AnularReciboUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
  ) {}

  async execute(input: AnularReciboInput): Promise<Recibo> {
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

    if (!recibo.estaVigente()) {
      throw new DomainError('Solo se puede anular un recibo vigente');
    }

    return this.reciboRepository.anular(recibo.id, input.motivo);
  }
}
