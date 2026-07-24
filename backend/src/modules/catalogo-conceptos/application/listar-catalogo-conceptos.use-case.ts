import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { ConceptoCatalogo } from '../domain/concepto-catalogo.entity';
import { CATALOGO_CONCEPTOS_REPOSITORY, ConceptoCatalogoRepository } from '../domain/concepto-catalogo.repository';

export interface ListarCatalogoConceptosInput {
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ListarCatalogoConceptosUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(CATALOGO_CONCEPTOS_REPOSITORY) private readonly catalogoConceptosRepository: ConceptoCatalogoRepository,
  ) {}

  async execute(input: ListarCatalogoConceptosInput): Promise<ConceptoCatalogo[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    return this.catalogoConceptosRepository.findAllByEmpresa(empresa.id);
  }
}
