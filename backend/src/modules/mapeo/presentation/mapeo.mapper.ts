import { PerfilMapeoConcepto } from '../domain/perfil-mapeo-concepto.entity';

export interface PerfilMapeoConceptoResponse {
  id: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export function toPerfilMapeoResponse(perfil: PerfilMapeoConcepto): PerfilMapeoConceptoResponse {
  return {
    id: perfil.id,
    concepto: perfil.conceptoOriginal,
    tipo: perfil.clasificacion.tipo,
    categoriaContribucion: perfil.clasificacion.categoriaContribucion,
  };
}
