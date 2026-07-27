import { ImportacionFila } from '../domain/importacion-fila.entity';
import { Importacion } from '../domain/importacion.entity';

export interface ImportacionFilaResponse {
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
  tipo: string | null;
  categoriaContribucion: string | null;
  unidad: string | null;
  base: number | null;
  correcciones: string[];
}

export interface ImportacionResponse {
  id: string;
  anio: number;
  mes: number;
  nombreArchivo: string;
  estado: string;
  fechaImportacion: string;
  fechaPago: string | null;
  lugarPago: string | null;
  fechaPagoCargasSociales: string | null;
  lugarPagoCargasSociales: string | null;
  datosEmisionCompletos: boolean;
  totalFilas: number;
  filasValidas: number;
  filasConError: number;
  filasSinClasificar: number;
  /** Cuántas filas recibieron alguna normalización automática de formato (ver ImportacionFila.correcciones). */
  filasConCorrecciones: number;
  filas: ImportacionFilaResponse[];
  hayOtraImportacionEnMismoPeriodo: boolean;
}

/** Resumen sin el detalle fila por fila — para el listado, no para el detalle de una importación puntual. */
export interface ImportacionResumenResponse {
  id: string;
  anio: number;
  mes: number;
  nombreArchivo: string;
  estado: string;
  fechaImportacion: string;
  totalFilas: number;
  filasValidas: number;
  filasConError: number;
}

export function toImportacionFilaResponse(fila: ImportacionFila): ImportacionFilaResponse {
  return {
    id: fila.id,
    numeroFila: fila.numeroFila,
    cuil: fila.cuil,
    nombre: fila.nombre,
    apellido: fila.apellido,
    concepto: fila.concepto,
    montoOriginal: fila.montoOriginal,
    monto: fila.monto,
    valida: fila.valida,
    errorMensaje: fila.errorMensaje,
    tipo: fila.clasificacion?.tipo ?? null,
    categoriaContribucion: fila.clasificacion?.categoriaContribucion ?? null,
    unidad: fila.unidad,
    base: fila.base,
    correcciones: fila.correcciones,
  };
}

export function toImportacionResumenResponse(importacion: Importacion): ImportacionResumenResponse {
  return {
    id: importacion.id,
    anio: importacion.anio,
    mes: importacion.mes,
    nombreArchivo: importacion.nombreArchivo,
    estado: importacion.estado,
    fechaImportacion: importacion.fechaImportacion.toISOString(),
    totalFilas: importacion.filas.length,
    filasValidas: importacion.filas.filter((fila) => fila.valida).length,
    filasConError: importacion.filas.filter((fila) => !fila.valida).length,
  };
}

export function toImportacionResponse(
  importacion: Importacion,
  hayOtraImportacionEnMismoPeriodo = false,
  /** Conceptos (normalizados) ya definidos en el catálogo de la empresa — ver ObtenerImportacionUseCase. */
  conceptosCatalogados: Set<string> = new Set(),
): ImportacionResponse {
  return {
    id: importacion.id,
    anio: importacion.anio,
    mes: importacion.mes,
    nombreArchivo: importacion.nombreArchivo,
    estado: importacion.estado,
    fechaImportacion: importacion.fechaImportacion.toISOString(),
    fechaPago: importacion.fechaPago ? importacion.fechaPago.toISOString().slice(0, 10) : null,
    lugarPago: importacion.lugarPago,
    fechaPagoCargasSociales: importacion.fechaPagoCargasSociales
      ? importacion.fechaPagoCargasSociales.toISOString().slice(0, 10)
      : null,
    lugarPagoCargasSociales: importacion.lugarPagoCargasSociales,
    datosEmisionCompletos: importacion.tieneDatosDeEmisionCompletos(),
    totalFilas: importacion.filas.length,
    filasValidas: importacion.filas.filter((fila) => fila.valida).length,
    filasConError: importacion.filas.filter((fila) => !fila.valida).length,
    filasSinClasificar: importacion.filas.filter(
      (fila) => fila.valida && !fila.estaClasificada() && !conceptosCatalogados.has(fila.conceptoNormalizado()),
    ).length,
    filasConCorrecciones: importacion.filas.filter((fila) => fila.correcciones.length > 0).length,
    filas: importacion.filas.map(toImportacionFilaResponse),
    hayOtraImportacionEnMismoPeriodo,
  };
}
