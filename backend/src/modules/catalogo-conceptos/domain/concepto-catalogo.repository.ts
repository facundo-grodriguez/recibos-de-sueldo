import { ConceptoCatalogo } from './concepto-catalogo.entity';

export interface DefinirConceptoCatalogoData {
  empresaId: string;
  conceptoOriginal: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export interface ConceptoCatalogoRepository {
  /** Crea la entrada si no existía, o la reemplaza si el concepto ya estaba clasificado. */
  upsert(data: DefinirConceptoCatalogoData): Promise<ConceptoCatalogo>;
  findAllByEmpresa(empresaId: string): Promise<ConceptoCatalogo[]>;
  /** Valor previo (si existe), para poder auditar el diff antes de sobrescribirlo con `upsert`. */
  findByEmpresaAndConceptoNormalizado(
    empresaId: string,
    conceptoNormalizado: string,
  ): Promise<ConceptoCatalogo | null>;
  findByIdAndEmpresa(id: string, empresaId: string): Promise<ConceptoCatalogo | null>;
}

export const CATALOGO_CONCEPTOS_REPOSITORY = Symbol('ConceptoCatalogoRepository');
