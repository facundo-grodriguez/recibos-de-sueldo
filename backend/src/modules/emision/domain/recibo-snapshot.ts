export interface ReciboSnapshotEmpresa {
  razonSocial: string;
  cuit: string;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
}

export interface ReciboSnapshotEmpleado {
  nombre: string;
  apellido: string;
  cuil: string;
  categoria: string | null;
  fechaIngreso: string | null;
  /** Ya calculada al momento de emitir, ej. "2 años y 3 meses". */
  antiguedad: string;
  legajo: string | null;
  banco: string | null;
}

export interface ReciboSnapshotPeriodo {
  anio: number;
  mes: number;
  fechaPago: string;
  lugarPago: string;
  fechaPagoCargasSociales: string;
  lugarPagoCargasSociales: string;
}

export interface ReciboSnapshotConcepto {
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
  monto: number;
  /** Auditoría de cálculo, informativa — ver FilaCanonica. */
  unidad: string | null;
  base: number | null;
}

/**
 * Cruce Empleador/Trabajador de una misma categoría normativa (ej. cuánto
 * aportó el empleador de Seguridad Social vs. cuánto se le retuvo al
 * trabajador) — sección "Detalle de la composición salarial" de la
 * plantilla oficial. Solo incluye categorías con algún monto (empleador o
 * trabajador) mayor a cero.
 */
export interface ReciboSnapshotDetalleCategoria {
  categoria: string;
  etiqueta: string;
  empleador: number;
  trabajador: number;
  total: number;
}

export interface ReciboSnapshotTotales {
  totalBruto: number;
  totalDeducciones: number;
  totalContribucionesPatronales: number;
  neto: number;
  costoLaboralTotal: number;
}

export interface ReciboSnapshotSegmento {
  etiqueta: string;
  monto: number;
  porcentaje: number;
  color: string;
}

/**
 * Foto completa y resuelta de un recibo al momento de emitir. Es lo que se
 * persiste y lo que se usa para renderizar el PDF — nunca se vuelve a leer
 * Empresa/Empleado/mapeo en vivo, así un cambio posterior en esos datos
 * nunca altera un recibo ya emitido.
 */
export interface ReciboSnapshot {
  empresa: ReciboSnapshotEmpresa;
  empleado: ReciboSnapshotEmpleado;
  periodo: ReciboSnapshotPeriodo;
  conceptos: ReciboSnapshotConcepto[];
  totales: ReciboSnapshotTotales;
  segmentosCostoLaboral: ReciboSnapshotSegmento[];
  detalleComposicionSalarial: ReciboSnapshotDetalleCategoria[];
}
