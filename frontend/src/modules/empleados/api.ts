import { request } from '../../shared/api/http';
import type { CrearEmpleadoFormValues, EditarEmpleadoFormValues } from './schema';

export type EstadoEmpleado = 'activo' | 'inactivo';

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  cuil: string;
  estado: EstadoEmpleado;
  categoria: string | null;
  fechaIngreso: string | null;
  legajo: string | null;
  banco: string | null;
}

export function listarEmpleados(token: string, empresaId: string): Promise<Empleado[]> {
  return request<Empleado[]>(`/empresas/${empresaId}/empleados`, { token });
}

export function crearEmpleado(token: string, empresaId: string, datos: CrearEmpleadoFormValues): Promise<Empleado> {
  return request<Empleado>(`/empresas/${empresaId}/empleados`, { method: 'POST', token, body: datos });
}

export function actualizarEmpleado(
  token: string,
  empresaId: string,
  empleadoId: string,
  datos: Partial<EditarEmpleadoFormValues>,
): Promise<Empleado> {
  return request<Empleado>(`/empresas/${empresaId}/empleados/${empleadoId}`, {
    method: 'PATCH',
    token,
    body: datos,
  });
}

export function cambiarEstadoEmpleado(
  token: string,
  empresaId: string,
  empleadoId: string,
  estado: EstadoEmpleado,
): Promise<Empleado> {
  return request<Empleado>(`/empresas/${empresaId}/empleados/${empleadoId}/estado`, {
    method: 'PATCH',
    token,
    body: { estado },
  });
}
