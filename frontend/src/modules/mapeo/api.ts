import { request } from '../../shared/api/http';
import type { DefinirMapeoFormValues } from './schema';

export interface PerfilMapeoConcepto {
  id: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export function listarConceptosSinMapear(token: string, empresaId: string): Promise<string[]> {
  return request<{ conceptos: string[] }>(`/empresas/${empresaId}/conceptos-sin-mapear`, { token }).then(
    (r) => r.conceptos,
  );
}

export function definirMapeo(
  token: string,
  empresaId: string,
  datos: DefinirMapeoFormValues,
): Promise<PerfilMapeoConcepto & { filasActualizadas: number }> {
  return request(`/empresas/${empresaId}/conceptos-mapeados`, { method: 'POST', token, body: datos });
}
