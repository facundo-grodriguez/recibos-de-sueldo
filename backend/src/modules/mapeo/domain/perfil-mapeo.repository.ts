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
}

export const PERFIL_MAPEO_REPOSITORY = Symbol('PerfilMapeoRepository');
