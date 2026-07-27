import { ApiError, request, requestFormData } from '../../shared/api/http';
import type { EmpresaFormValues } from './schema';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

export interface Empresa {
  id: string;
  razonSocial: string;
  cuit: string;
  nombreFantasia: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  tieneLogo: boolean;
}

export function listarEmpresas(token: string): Promise<Empresa[]> {
  return request<Empresa[]>('/empresas', { token });
}

export function crearEmpresa(token: string, datos: EmpresaFormValues): Promise<Empresa> {
  return request<Empresa>('/empresas', { method: 'POST', token, body: datos });
}

export function actualizarEmpresa(
  token: string,
  empresaId: string,
  datos: Partial<EmpresaFormValues>,
): Promise<Empresa> {
  return request<Empresa>(`/empresas/${empresaId}`, { method: 'PATCH', token, body: datos });
}

export function subirLogoEmpresa(token: string, empresaId: string, archivo: File): Promise<Empresa> {
  const formData = new FormData();
  formData.append('logo', archivo);
  return requestFormData<Empresa>(`/empresas/${empresaId}/logo`, formData, token);
}

/** Trae el logo como blob URL para mostrarlo en un <img> — no se puede pedir directo con <img src="...">
 * porque esa etiqueta no manda el header de autenticación. Quien la use debe revocarla (URL.revokeObjectURL) al terminar. */
export async function obtenerLogoEmpresaUrl(token: string, empresaId: string): Promise<string> {
  const response = await fetch(`${API_URL}/empresas/${empresaId}/logo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ApiError('No se pudo obtener el logo', response.status);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
