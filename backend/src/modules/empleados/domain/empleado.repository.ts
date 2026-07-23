import { EstadoEmpleado, Empleado } from './empleado.entity';

export interface CrearEmpleadoData {
  empresaId: string;
  nombre: string;
  apellido: string;
  cuil: string;
}

export interface ActualizarEmpleadoData {
  nombre?: string;
  apellido?: string;
  categoria?: string | null;
  fechaIngreso?: Date | null;
  legajo?: string | null;
  banco?: string | null;
  estado?: EstadoEmpleado;
}

export interface EmpleadoRepository {
  create(data: CrearEmpleadoData): Promise<Empleado>;
  /**
   * Alta en lote de los empleados indicados, en una única operación. Los
   * CUIL que ya existan en la empresa se ignoran silenciosamente (equivalente
   * a "ON CONFLICT DO NOTHING" sobre `@@unique([empresaId, cuil])`) — reemplaza
   * al patrón de un `create` por CUIL adentro de un `for` (perfil de
   * rendimiento, 2026-07-19).
   */
  crearVarios(datos: CrearEmpleadoData[]): Promise<void>;
  findAllByEmpresa(empresaId: string): Promise<Empleado[]>;
  findByCuilAndEmpresa(empresaId: string, cuil: string): Promise<Empleado | null>;
  /** Todos los empleados de la empresa cuyo CUIL esté en la lista, en una única consulta. */
  findAllByCuilsAndEmpresa(empresaId: string, cuils: string[]): Promise<Empleado[]>;
  findByIdAndEmpresa(id: string, empresaId: string): Promise<Empleado | null>;
  /** Para validar unicidad de legajo dentro de la empresa antes de guardar (ver ActualizarEmpleadoUseCase). */
  findByLegajoAndEmpresa(empresaId: string, legajo: string): Promise<Empleado | null>;
  actualizar(id: string, data: ActualizarEmpleadoData): Promise<Empleado>;
}

export const EMPLEADO_REPOSITORY = Symbol('EmpleadoRepository');
