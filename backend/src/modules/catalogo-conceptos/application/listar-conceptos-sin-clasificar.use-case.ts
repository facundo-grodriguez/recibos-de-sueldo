import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { CATALOGO_CONCEPTOS_REPOSITORY, ConceptoCatalogoRepository } from '../domain/concepto-catalogo.repository';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';

export interface ListarConceptosSinClasificarInput {
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ListarConceptosSinClasificarUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(CATALOGO_CONCEPTOS_REPOSITORY) private readonly catalogoConceptosRepository: ConceptoCatalogoRepository,
  ) {}

  async execute(input: ListarConceptosSinClasificarInput): Promise<string[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const pendientes = await this.importacionRepository.listarConceptosPendientes(empresa.id);
    const catalogados = await this.catalogoConceptosRepository.findAllByEmpresa(empresa.id);
    const normalizadosEnCatalogo = new Set(catalogados.map((c) => c.conceptoNormalizado()));

    // Un concepto ya definido en el catálogo se autoclasifica al confirmar
    // (ADR-025/026) — no tiene sentido pedirle al usuario que lo reclasifique
    // a mano en cada importación nueva, solo los que el catálogo nunca vio.
    return pendientes.filter((concepto) => !normalizadosEnCatalogo.has(normalizarConcepto(concepto)));
  }
}
