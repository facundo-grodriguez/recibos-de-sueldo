import { downloadFile } from '../../shared/api/download';
import { request } from '../../shared/api/http';

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
  return request<Recibo[]>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos`, { token });
}

export function emitirRecibos(token: string, empresaId: string, importacionId: string): Promise<Recibo[]> {
  return request<Recibo[]>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos/emitir`, {
    method: 'POST',
    token,
  });
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

export function reemitirRecibo(
  token: string,
  empresaId: string,
  importacionId: string,
  reciboId: string,
): Promise<Recibo> {
  return request<Recibo>(`/empresas/${empresaId}/importaciones/${importacionId}/recibos/${reciboId}/reemitir`, {
    method: 'POST',
    token,
  });
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

export function listarHistorialRecibos(
  token: string,
  empresaId: string,
  empleadoId?: string,
): Promise<Recibo[]> {
  const query = empleadoId ? `?empleadoId=${empleadoId}` : '';
  return request<Recibo[]>(`/empresas/${empresaId}/recibos${query}`, { token });
}
