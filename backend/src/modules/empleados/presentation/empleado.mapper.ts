import { Empleado } from '../domain/empleado.entity';

export interface EmpleadoResponse {
  id: string;
  nombre: string;
  apellido: string;
  cuil: string;
  estado: string;
  categoria: string | null;
  fechaIngreso: string | null;
  legajo: string | null;
  banco: string | null;
}

export function toEmpleadoResponse(empleado: Empleado): EmpleadoResponse {
  return {
    id: empleado.id,
    nombre: empleado.nombre,
    apellido: empleado.apellido,
    cuil: empleado.cuil.formatted,
    estado: empleado.estado,
    categoria: empleado.categoria,
    fechaIngreso: empleado.fechaIngreso ? empleado.fechaIngreso.toISOString().slice(0, 10) : null,
    legajo: empleado.legajo,
    banco: empleado.banco,
  };
}
