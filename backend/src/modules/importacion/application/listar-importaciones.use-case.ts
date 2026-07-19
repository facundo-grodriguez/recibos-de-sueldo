import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Importacion } from '../domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';

export interface ListarImportacionesInput {
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ListarImportacionesUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
  ) {}

  async execute(input: ListarImportacionesInput): Promise<Importacion[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    return this.importacionRepository.findAllByEmpresa(empresa.id);
  }
}
