import { ClasificacionConcepto } from '../../../shared/value-objects/clasificacion-concepto';
import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';
import { calcularTotalesEmpleado } from '../../validacion/domain/calcular-totales-empleado';
import { calcularAntiguedad } from './calcular-antiguedad';
import { construirDetalleComposicionSalarial } from './construir-detalle-composicion-salarial';
import { construirSegmentosCostoLaboral } from './construir-segmentos-costo-laboral';
import { ReciboSnapshot, ReciboSnapshotConcepto } from './recibo-snapshot';

export interface ConstruirSnapshotReciboParams {
  empresa: {
    razonSocial: string;
    cuit: string;
    domicilio: string | null;
    localidad: string | null;
    provincia: string | null;
    codigoPostal: string | null;
  };
  empleado: {
    nombre: string;
    apellido: string;
    cuil: string;
    categoria: string | null;
    fechaIngreso: Date | null;
    legajo: string | null;
    banco: string | null;
  };
  periodo: {
    anio: number;
    mes: number;
    fechaPago: Date;
    lugarPago: string;
    fechaPagoCargasSociales: Date;
    lugarPagoCargasSociales: string;
  };
  /** Filas válidas y clasificadas de este empleado, para este período. */
  filas: ImportacionFila[];
  /** Fecha contra la que se calcula la antigüedad (momento de emitir/reemitir). */
  fechaReferencia: Date;
}

type FilaClasificadaYValida = ImportacionFila & { monto: number; clasificacion: ClasificacionConcepto };

function esFilaClasificadaYValida(fila: ImportacionFila): fila is FilaClasificadaYValida {
  return fila.clasificacion !== null && fila.monto !== null;
}

function conceptosDelSnapshot(filas: ImportacionFila[]): ReciboSnapshotConcepto[] {
  return filas.filter(esFilaClasificadaYValida).map((fila) => ({
    concepto: fila.concepto,
    tipo: fila.clasificacion.tipo,
    categoriaContribucion: fila.clasificacion.categoriaContribucion,
    monto: fila.monto,
    unidad: fila.unidad,
    base: fila.base,
  }));
}

function aFechaCorta(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Arma el snapshot completo de un recibo a partir de los datos VIGENTES de
 * empresa/empleado/período al momento de llamarla. La usan tanto la emisión
 * original como la reemisión (Fase 5) — reemitir es, a propósito, "generar
 * el recibo correcto con los datos correctos de hoy", así que ambas comparten
 * exactamente esta misma construcción (ver ADR-041).
 */
export function construirSnapshotRecibo(params: ConstruirSnapshotReciboParams): ReciboSnapshot {
  const totales = calcularTotalesEmpleado(params.filas);
  const detalleComposicionSalarial = construirDetalleComposicionSalarial(params.filas);

  return {
    empresa: { ...params.empresa },
    empleado: {
      nombre: params.empleado.nombre,
      apellido: params.empleado.apellido,
      cuil: params.empleado.cuil,
      categoria: params.empleado.categoria,
      fechaIngreso: params.empleado.fechaIngreso ? aFechaCorta(params.empleado.fechaIngreso) : null,
      antiguedad: params.empleado.fechaIngreso
        ? calcularAntiguedad(params.empleado.fechaIngreso, params.fechaReferencia)
        : '—',
      legajo: params.empleado.legajo,
      banco: params.empleado.banco,
    },
    periodo: {
      anio: params.periodo.anio,
      mes: params.periodo.mes,
      fechaPago: aFechaCorta(params.periodo.fechaPago),
      lugarPago: params.periodo.lugarPago,
      fechaPagoCargasSociales: aFechaCorta(params.periodo.fechaPagoCargasSociales),
      lugarPagoCargasSociales: params.periodo.lugarPagoCargasSociales,
    },
    conceptos: conceptosDelSnapshot(params.filas),
    totales,
    segmentosCostoLaboral: construirSegmentosCostoLaboral(detalleComposicionSalarial, totales.totalBruto, totales.costoLaboralTotal),
    detalleComposicionSalarial,
  };
}
