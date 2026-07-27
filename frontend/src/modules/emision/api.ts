import { downloadFile } from '../../shared/api/download';
import { request } from '../../shared/api/http';
import type { ImportacionFila } from '../importacion/api';

export interface Recibo {
  id: string;
  numero: number;
  importacionId: string;
  empleadoId: string;
  cuil: string;
  nombre: string;
  apellido: string;
  neto: number;
  costoLaboralTotal: number;
  hashIntegridad: string;
  fechaEmision: string;
  estado: string;
  motivoAnulacion: string | null;
  reemplazaAId: string | null;
}

export function listarRecibos(token: string, empresaId: string, importacionId: string): Promise<Recibo[]> {
  // incluirAnulados=true: la tabla (RecibosTable) muestra ambos estados y
  // ofrece "Reemitir" sobre los anulados — sin este flag, un recibo
  // desaparecía de la lista apenas se anulaba, sin forma de reemitirlo.
  return request<Recibo[]>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos?incluirAnulados=true`, {
    token,
  });
}

export function emitirRecibos(token: string, empresaId: string, importacionId: string): Promise<Recibo[]> {
  return request<Recibo[]>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos/emitir`, {
    method: 'POST',
    token,
  });
}

export interface EmpleadoPendienteDeEmision {
  id: string;
  nombre: string;
  apellido: string;
  cuil: string;
}

/** Empleados activos de esta importación que todavía no tienen recibo — típicamente porque se
 * saltearon al emitir (estaban inactivos en ese momento) y después alguien los reactivó. */
export function listarEmpleadosPendientesDeEmision(
  token: string,
  empresaId: string,
  importacionId: string,
): Promise<EmpleadoPendienteDeEmision[]> {
  return request<EmpleadoPendienteDeEmision[]>(
    `/empresas/${empresaId}/importaciones/${importacionId}/recibos/pendientes`,
    { token },
  );
}

export function descargarRecibo(
  token: string | null,
  empresaId: string,
  importacionId: string,
  recibo: Recibo,
): Promise<void> {
  const nombreSugerido = `Recibo - ${recibo.apellido} ${recibo.nombre}.pdf`;
  return downloadFile(
    `/empresas/${empresaId}/importaciones/${importacionId}/recibos/${recibo.id}/descargar`,
    token,
    nombreSugerido,
  );
}

export function descargarLoteRecibos(
  token: string | null,
  empresaId: string,
  importacionId: string,
): Promise<void> {
  return downloadFile(
    `/empresas/${empresaId}/importaciones/${importacionId}/recibos/descargar-lote`,
    token,
    'recibos.zip',
  );
}

export function anularRecibo(
  token: string,
  empresaId: string,
  importacionId: string,
  reciboId: string,
  motivo: string,
): Promise<Recibo> {
  return request<Recibo>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos/${reciboId}/anular`, {
    method: 'POST',
    token,
    body: { motivo },
  });
}

export interface AjusteFilaReemision {
  filaId: string;
  cambios: Partial<Record<'cuil' | 'nombre' | 'apellido' | 'concepto' | 'monto' | 'unidad' | 'base', string>>;
}

export function reemitirRecibo(
  token: string,
  empresaId: string,
  importacionId: string,
  reciboId: string,
  ajustes?: AjusteFilaReemision[],
): Promise<Recibo> {
  return request<Recibo>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos/${reciboId}/reemitir`, {
    method: 'POST',
    token,
    body: { ajustes },
  });
}

export function previsualizarReemision(
  token: string,
  empresaId: string,
  importacionId: string,
  reciboId: string,
): Promise<{ filas: ImportacionFila[] }> {
  return request<{ filas: ImportacionFila[] }>(
    `/empresas/${empresaId}/importaciones/${importacionId}/recibos/${reciboId}/previsualizar-reemision`,
    { token },
  );
}

export interface AuditoriaReciboEntry {
  id: string;
  timestamp: string;
  accion: string;
}

export function obtenerAuditoriaRecibo(
  token: string,
  empresaId: string,
  importacionId: string,
  reciboId: string,
): Promise<AuditoriaReciboEntry[]> {
  return request<AuditoriaReciboEntry[]>(
    `/empresas/${empresaId}/importaciones/${importacionId}/recibos/${reciboId}/auditoria`,
    { token },
  );
}

export interface HistorialRecibosPagina {
  recibos: Recibo[];
  total: number;
  pagina: number;
  porPagina: number;
}

export function listarHistorialRecibos(
  token: string,
  empresaId: string,
  empleadoId?: string,
  pagina?: number,
): Promise<HistorialRecibosPagina> {
  const params = new URLSearchParams();
  if (empleadoId) params.set('empleadoId', empleadoId);
  if (pagina) params.set('pagina', String(pagina));
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<HistorialRecibosPagina>(`/empresas/${empresaId}/recibos${query}`, { token });
}
