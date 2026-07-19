import { DomainError } from '../../../shared/errors/domain-error';
import { ReciboSnapshot } from './recibo-snapshot';

export type EstadoRecibo = 'vigente' | 'anulado';

export interface ReciboProps {
  id: string;
  importacionId: string;
  empleadoId: string;
  numero: number;
  snapshot: ReciboSnapshot;
  pdfPath: string;
  hashIntegridad: string;
  fechaEmision: Date;
  estado?: EstadoRecibo;
  motivoAnulacion?: string | null;
  reemplazaAId?: string | null;
}

/**
 * Documento inmutable: una vez creado, sus datos (snapshot/PDF/hash) nunca se
 * actualizan. Lo único que puede cambiar con el tiempo es su `estado` — de
 * `vigente` a `anulado` (Fase 5) — nunca al revés, y nunca se borra.
 */
export class Recibo {
  public readonly id: string;
  public readonly importacionId: string;
  public readonly empleadoId: string;
  public readonly numero: number;
  public readonly snapshot: ReciboSnapshot;
  public readonly pdfPath: string;
  public readonly hashIntegridad: string;
  public readonly fechaEmision: Date;
  public readonly estado: EstadoRecibo;
  public readonly motivoAnulacion: string | null;
  /** Si no es null: este recibo reemplaza al recibo anulado con este id. */
  public readonly reemplazaAId: string | null;

  private constructor(props: ReciboProps) {
    if (props.numero < 1) {
      throw new DomainError(`Número de recibo inválido: ${props.numero}`);
    }
    const estado = props.estado ?? 'vigente';
    if (estado === 'anulado' && !props.motivoAnulacion?.trim()) {
      throw new DomainError('Un recibo anulado debe tener un motivo de anulación');
    }

    this.id = props.id;
    this.importacionId = props.importacionId;
    this.empleadoId = props.empleadoId;
    this.numero = props.numero;
    this.snapshot = props.snapshot;
    this.pdfPath = props.pdfPath;
    this.hashIntegridad = props.hashIntegridad;
    this.fechaEmision = props.fechaEmision;
    this.estado = estado;
    this.motivoAnulacion = props.motivoAnulacion ?? null;
    this.reemplazaAId = props.reemplazaAId ?? null;
  }

  static create(props: ReciboProps): Recibo {
    return new Recibo(props);
  }

  estaVigente(): boolean {
    return this.estado === 'vigente';
  }
}
