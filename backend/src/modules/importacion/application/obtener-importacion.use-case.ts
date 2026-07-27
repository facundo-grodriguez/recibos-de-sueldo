import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { CATALOGO_CONCEPTOS_REPOSITORY, ConceptoCatalogoRepository } from '../../catalogo-conceptos/domain/concepto-catalogo.repository';
import { Importacion } from '../domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';

export interface ObtenerImportacionInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

export interface ObtenerImportacionResultado {
  importacion: Importacion;
  /** Etapa 3: aviso (no bloqueo) si ya existe otra importación de esta empresa para el mismo período. */
  hayOtraImportacionEnMismoPeriodo: boolean;
  /**
   * Conceptos (normalizados) ya definidos en el catálogo de la empresa — se autoclasifican
   * solos al confirmar (ADR-025/026), así que no cuentan como "sin clasificar" para la vista
   * de previsualización aunque la fila todavía tenga `tipo: null` en la base.
   */
  conceptosCatalogados: Set<string>;
}

@Injectable()
export class ObtenerImportacionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(CATALOGO_CONCEPTOS_REPOSITORY) private readonly catalogoConceptosRepository: ConceptoCatalogoRepository,
  ) {}

  async execute(input: ObtenerImportacionInput): Promise<ObtenerImportacionResultado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const [hayOtraImportacionEnMismoPeriodo, catalogo] = await Promise.all([
      this.importacionRepository.existeOtraEnMismoPeriodo(empresa.id, importacion.anio, importacion.mes, importacion.id),
      this.catalogoConceptosRepository.findAllByEmpresa(empresa.id),
    ]);
    const conceptosCatalogados = new Set(catalogo.map((concepto) => concepto.conceptoNormalizado()));

    return { importacion, hayOtraImportacionEnMismoPeriodo, conceptosCatalogados };
  }
}
