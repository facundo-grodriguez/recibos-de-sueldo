import { request } from '../../shared/api/http';
import type { EmpresaFormValues } from './schema';

export interface Empresa {
  id: string;
  razonSocial: string;
  cuit: string;
  nombreFantasia: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
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
