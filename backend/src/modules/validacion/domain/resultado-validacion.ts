export interface TotalesEmpleado {
  totalBruto: number;
  totalDeducciones: number;
  totalContribucionesPatronales: number;
  neto: number;
  costoLaboralTotal: number;
}

export interface ResultadoValidacionEmpleado {
  cuil: string;
  nombre: string;
  apellido: string;
  totales: TotalesEmpleado;
  errores: string[];
  advertencias: string[];
}

export interface ResultadoValidacionImportacion {
  importacionId: string;
  /** true si no hay ningún error bloqueante, global ni de ningún empleado. */
  puedeEmitirse: boolean;
  erroresGlobales: string[];
  empleados: ResultadoValidacionEmpleado[];
}
