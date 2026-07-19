import { PerfilMapeoConcepto } from './perfil-mapeo-concepto.entity';

export interface DefinirMapeoData {
  empresaId: string;
  conceptoOriginal: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export interface PerfilMapeoRepository {
  /** Crea la entrada si no existía, o la reemplaza si el concepto ya estaba mapeado. */
  upsert(data: DefinirMapeoData): Promise<PerfilMapeoConcepto>;
  findAllByEmpresa(empresaId: string): Promise<PerfilMapeoConcepto[]>;
  /** Valor previo (si existe), para poder auditar el diff antes de sobrescribirlo con `upsert`. */
  findByEmpresaAndConceptoNormalizado(
    empresaId: string,
    conceptoNormalizado: string,
  ): Promise<PerfilMapeoConcepto | null>;
  findByIdAndEmpresa(id: string, empresaId: string): Promise<PerfilMapeoConcepto | null>;
}

export const PERFIL_MAPEO_REPOSITORY = Symbol('PerfilMapeoRepository');
