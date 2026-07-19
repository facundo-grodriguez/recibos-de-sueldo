import { request } from '../../shared/api/http';

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
  puedeEmitirse: boolean;
  erroresGlobales: string[];
  empleados: ResultadoValidacionEmpleado[];
}

export function obtenerValidacion(
  token: string,
  empresaId: string,
  importacionId: string,
): Promise<ResultadoValidacionImportacion> {
  return request<ResultadoValidacionImportacion>(`/empresas/${empresaId}/importaciones/${importacionId}/validacion`, {
    token,
  });
}
