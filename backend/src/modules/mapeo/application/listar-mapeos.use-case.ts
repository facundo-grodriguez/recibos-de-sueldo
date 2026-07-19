import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { PerfilMapeoConcepto } from '../domain/perfil-mapeo-concepto.entity';
import { PERFIL_MAPEO_REPOSITORY, PerfilMapeoRepository } from '../domain/perfil-mapeo.repository';

export interface ListarMapeosInput {
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ListarMapeosUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(PERFIL_MAPEO_REPOSITORY) private readonly perfilMapeoRepository: PerfilMapeoRepository,
  ) {}

  async execute(input: ListarMapeosInput): Promise<PerfilMapeoConcepto[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    return this.perfilMapeoRepository.findAllByEmpresa(empresa.id);
  }
}
