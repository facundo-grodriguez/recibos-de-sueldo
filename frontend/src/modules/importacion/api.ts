import { request, requestFormData } from '../../shared/api/http';
import type { CorregirFilaFormValues, DatosEmisionFormValues, ImportarArchivoFormValues } from './schema';

export interface ImportacionResumen {
  id: string;
  anio: number;
  mes: number;
  nombreArchivo: string;
  estado: 'previsualizada' | 'confirmada' | 'descartada';
  fechaImportacion: string;
  totalFilas: number;
  filasValidas: number;
  filasConError: number;
}

export interface ImportacionFila {
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

export interface Importacion extends ImportacionResumen {
  fechaPago: string | null;
  lugarPago: string | null;
  fechaPagoCargasSociales: string | null;
  lugarPagoCargasSociales: string | null;
  datosEmisionCompletos: boolean;
  filasSinClasificar: number;
  filasConCorrecciones: number;
  filas: ImportacionFila[];
  /** Etapa 3: aviso (no bloqueo) si ya existe otra importación de esta empresa para el mismo período. */
  hayOtraImportacionEnMismoPeriodo: boolean;
}

export function listarImportaciones(token: string, empresaId: string): Promise<ImportacionResumen[]> {
  return request<ImportacionResumen[]>(`/empresas/${empresaId}/importaciones`, { token });
}

export function obtenerImportacion(token: string, empresaId: string, importacionId: string): Promise<Importacion> {
  return request<Importacion>(`/empresas/${empresaId}/importaciones/${importacionId}`, { token });
}

export function importarArchivo(
  token: string,
  empresaId: string,
  datos: ImportarArchivoFormValues,
  archivo: File,
): Promise<Importacion> {
  const formData = new FormData();
  formData.append('anio', String(datos.anio));
  formData.append('mes', String(datos.mes));
  formData.append('archivo', archivo);
  return requestFormData<Importacion>(`/empresas/${empresaId}/importaciones`, formData, token);
}

export function corregirFilaImportacion(
  token: string,
  empresaId: string,
  importacionId: string,
  filaId: string,
  cambios: Partial<CorregirFilaFormValues>,
): Promise<Importacion> {
  return request<Importacion>(`/empresas/${empresaId}/importaciones/${importacionId}/filas/${filaId}`, {
    method: 'PATCH',
    token,
    body: cambios,
  });
}

export function confirmarImportacion(token: string, empresaId: string, importacionId: string): Promise<Importacion> {
  return request<Importacion>(`/empresas/${empresaId}/importaciones/${importacionId}/confirmar`, {
    method: 'POST',
    token,
  });
}

export function descartarImportacion(token: string, empresaId: string, importacionId: string): Promise<Importacion> {
  return request<Importacion>(`/empresas/${empresaId}/importaciones/${importacionId}/descartar`, {
    method: 'POST',
    token,
  });
}

export function actualizarDatosEmision(
  token: string,
  empresaId: string,
  importacionId: string,
  datos: Partial<DatosEmisionFormValues>,
): Promise<Importacion> {
  return request<Importacion>(`/empresas/${empresaId}/importaciones/${importacionId}/datos-emision`, {
    method: 'PATCH',
    token,
    body: datos,
  });
}
