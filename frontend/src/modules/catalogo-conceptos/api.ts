import { request } from '../../shared/api/http';
import type { DefinirConceptoCatalogoFormValues } from './schema';

export interface ConceptoCatalogo {
  id: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export function listarConceptosSinClasificar(token: string, empresaId: string): Promise<string[]> {
  return request<{ conceptos: string[] }>(`/empresas/${empresaId}/conceptos/sin-clasificar`, { token }).then(
    (r) => r.conceptos,
  );
}

export function listarCatalogoConceptos(token: string, empresaId: string): Promise<ConceptoCatalogo[]> {
  return request(`/empresas/${empresaId}/conceptos`, { token });
}

export function definirConceptoCatalogo(
  token: string,
  empresaId: string,
  datos: DefinirConceptoCatalogoFormValues,
): Promise<ConceptoCatalogo & { filasActualizadas: number }> {
  return request(`/empresas/${empresaId}/conceptos`, { method: 'POST', token, body: datos });
}
