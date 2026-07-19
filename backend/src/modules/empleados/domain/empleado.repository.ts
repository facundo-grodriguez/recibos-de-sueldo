import { EstadoEmpleado, Empleado } from './empleado.entity';

export interface CrearEmpleadoData {
  empresaId: string;
  nombre: string;
  apellido: string;
  cuil: string;
}

export interface ActualizarEmpleadoData {
  categoria?: string | null;
  fechaIngreso?: Date | null;
  legajo?: string | null;
  banco?: string | null;
  estado?: EstadoEmpleado;
}

export interface EmpleadoRepository {
  create(data: CrearEmpleadoData): Promise<Empleado>;
  findAllByEmpresa(empresaId: string): Promise<Empleado[]>;
  findByCuilAndEmpresa(empresaId: string, cuil: string): Promise<Empleado | null>;
  findByIdAndEmpresa(id: string, empresaId: string): Promise<Empleado | null>;
  actualizar(id: string, data: ActualizarEmpleadoData): Promise<Empleado>;
}

export const EMPLEADO_REPOSITORY = Symbol('EmpleadoRepository');
