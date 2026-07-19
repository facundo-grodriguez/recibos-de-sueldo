import { DomainError } from '../../../shared/errors/domain-error';
import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../../shared/utils/normalizar-concepto';

export interface ImportacionFilaProps {
  id: string;
  numeroFila: number;
  cuil: string;
  nombre: string;
  apellido: string;
  concepto: string;
  montoOriginal: string;
  monto: number | null;
  valida: boolean;
  errorMensaje: string | null;
  clasificacion?: ClasificacionConcepto | null;
  /** Auditoría de cálculo, informativa (ver FilaCanonica). */
  unidad?: string | null;
  base?: number | null;
  /** Normalizaciones de formato aplicadas sin bloquear la fila (ver validarFilaImportacion). */
  correcciones?: string[];
}

export class ImportacionFila {
  public readonly id: string;
  public readonly numeroFila: number;
  public readonly cuil: string;
  public readonly nombre: string;
  public readonly apellido: string;
  public readonly concepto: string;
  public readonly montoOriginal: string;
  public readonly monto: number | null;
  public readonly valida: boolean;
  public readonly errorMensaje: string | null;
  // null hasta que el motor de mapeo (Fase 2) clasifica el concepto de la fila.
  public readonly clasificacion: ClasificacionConcepto | null;
  public readonly unidad: string | null;
  public readonly base: number | null;
  public readonly correcciones: string[];

  private constructor(props: ImportacionFilaProps) {
    if (props.valida && props.monto === null) {
      throw new DomainError('Una fila válida debe tener un monto parseado');
    }
    if (!props.valida && !props.errorMensaje) {
      throw new DomainError('Una fila inválida debe tener un mensaje de error');
    }

    this.id = props.id;
    this.numeroFila = props.numeroFila;
    this.cuil = props.cuil;
    this.nombre = props.nombre;
    this.apellido = props.apellido;
    this.concepto = props.concepto;
    this.montoOriginal = props.montoOriginal;
    this.monto = props.monto;
    this.valida = props.valida;
    this.errorMensaje = props.errorMensaje;
    this.clasificacion = props.clasificacion ?? null;
    this.unidad = props.unidad ?? null;
    this.base = props.base ?? null;
    this.correcciones = props.correcciones ?? [];
  }

  static create(props: ImportacionFilaProps): ImportacionFila {
    return new ImportacionFila(props);
  }

  estaClasificada(): boolean {
    return this.clasificacion !== null;
  }

  conceptoNormalizado(): string {
    return normalizarConcepto(this.concepto);
  }
}
