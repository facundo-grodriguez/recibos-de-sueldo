import { DomainError } from '../../../shared/errors/domain-error';
import { Cuil } from '../../../shared/value-objects/cuil';

/** Nunca se borra un empleado (los recibos referencian `empleadoId` para siempre) — "baja" es marcar inactivo, reversible. */
export type EstadoEmpleado = 'activo' | 'inactivo';

export interface EmpleadoProps {
  id: string;
  empresaId: string;
  nombre: string;
  apellido: string;
  cuil: string;
  estado: string;
  categoria?: string | null;
  fechaIngreso?: Date | null;
  legajo?: string | null;
  banco?: string | null;
}

export class Empleado {
  public readonly id: string;
  public readonly empresaId: string;
  public readonly nombre: string;
  public readonly apellido: string;
  public readonly cuil: Cuil;
  public readonly estado: EstadoEmpleado;
  // Fase 4: ficha del empleado, se carga una vez y se reutiliza en cada recibo.
  public readonly categoria: string | null;
  public readonly fechaIngreso: Date | null;
  // Rediseño de plantilla: campo de la plantilla oficial, informativo.
  public readonly legajo: string | null;
  // Modelo funcional del Anexo III (docs/modelo-funcional-anexo-iii.md): campo real de la plantilla oficial, distinto de "lugar de pago".
  public readonly banco: string | null;

  private constructor(props: EmpleadoProps) {
    if (!props.nombre.trim() || !props.apellido.trim()) {
      throw new DomainError('Nombre y apellido son obligatorios');
    }
    if (props.estado !== 'activo' && props.estado !== 'inactivo') {
      throw new DomainError(`Estado de empleado inválido: "${props.estado}"`);
    }

    this.id = props.id;
    this.empresaId = props.empresaId;
    this.nombre = props.nombre.trim();
    this.apellido = props.apellido.trim();
    this.cuil = Cuil.create(props.cuil);
    this.estado = props.estado;
    this.categoria = props.categoria ?? null;
    this.fechaIngreso = props.fechaIngreso ?? null;
    this.legajo = props.legajo ?? null;
    this.banco = props.banco ?? null;
  }

  static create(props: EmpleadoProps): Empleado {
    return new Empleado(props);
  }
}
