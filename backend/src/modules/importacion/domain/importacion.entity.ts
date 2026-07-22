import { DomainError } from '../../../shared/errors/domain-error';
import { ImportacionFila } from './importacion-fila.entity';

/**
 * 'descartada' (Etapa 3, recuperación de errores): el contador empezó a importar el archivo/período
 * equivocado y quiere sacarlo de en medio — nunca se borra nada (el archivo y las filas quedan tal
 * cual), solo se oculta por defecto de la lista activa. Solo alcanzable desde 'previsualizada' —
 * nunca se descarta algo que ya se confirmó.
 */
export type EstadoImportacion = 'previsualizada' | 'confirmada' | 'descartada';

export interface ImportacionProps {
  id: string;
  empresaId: string;
  usuarioId: string;
  anio: number;
  mes: number;
  nombreArchivo: string;
  estado: EstadoImportacion;
  fechaImportacion: Date;
  filas: ImportacionFila[];
  fechaPago?: Date | null;
  lugarPago?: string | null;
  fechaPagoCargasSociales?: Date | null;
  lugarPagoCargasSociales?: string | null;
}

export class Importacion {
  public readonly id: string;
  public readonly empresaId: string;
  public readonly usuarioId: string;
  public readonly anio: number;
  public readonly mes: number;
  public readonly nombreArchivo: string;
  public readonly estado: EstadoImportacion;
  public readonly fechaImportacion: Date;
  public readonly filas: ImportacionFila[];
  // Fase 4: datos de cabecera del período, obligatorios recién antes de emitir.
  public readonly fechaPago: Date | null;
  public readonly lugarPago: string | null;
  public readonly fechaPagoCargasSociales: Date | null;
  public readonly lugarPagoCargasSociales: string | null;

  private constructor(props: ImportacionProps) {
    if (props.mes < 1 || props.mes > 12) {
      throw new DomainError(`Mes inválido: ${props.mes} (debe estar entre 1 y 12)`);
    }
    if (props.filas.length === 0) {
      throw new DomainError('El archivo no contiene filas para importar');
    }

    this.id = props.id;
    this.empresaId = props.empresaId;
    this.usuarioId = props.usuarioId;
    this.anio = props.anio;
    this.mes = props.mes;
    this.nombreArchivo = props.nombreArchivo;
    this.estado = props.estado;
    this.fechaImportacion = props.fechaImportacion;
    this.filas = props.filas;
    this.fechaPago = props.fechaPago ?? null;
    this.lugarPago = props.lugarPago ?? null;
    this.fechaPagoCargasSociales = props.fechaPagoCargasSociales ?? null;
    this.lugarPagoCargasSociales = props.lugarPagoCargasSociales ?? null;
  }

  static create(props: ImportacionProps): Importacion {
    return new Importacion(props);
  }

  tieneErrores(): boolean {
    return this.filas.some((fila) => !fila.valida);
  }

  cuilsUnicosValidos(): string[] {
    const cuils = this.filas.filter((fila) => fila.valida).map((fila) => fila.cuil);
    return [...new Set(cuils)];
  }

  /** Conceptos normalizados de las filas válidas que todavía no fueron clasificadas. */
  conceptosNormalizadosSinClasificar(): string[] {
    const conceptos = this.filas
      .filter((fila) => fila.valida && !fila.estaClasificada())
      .map((fila) => fila.conceptoNormalizado());
    return [...new Set(conceptos)];
  }

  /** Los 4 datos de cabecera del período que hacen falta antes de poder emitir. */
  tieneDatosDeEmisionCompletos(): boolean {
    return (
      this.fechaPago !== null &&
      this.lugarPago !== null &&
      this.fechaPagoCargasSociales !== null &&
      this.lugarPagoCargasSociales !== null
    );
  }

  /** Filas válidas de esta importación, agrupadas por CUIL. */
  agruparFilasPorCuilValido(): Map<string, ImportacionFila[]> {
    const mapa = new Map<string, ImportacionFila[]>();
    for (const fila of this.filas) {
      if (!fila.valida) continue;
      const filasDelCuil = mapa.get(fila.cuil) ?? [];
      filasDelCuil.push(fila);
      mapa.set(fila.cuil, filasDelCuil);
    }
    return mapa;
  }
}
