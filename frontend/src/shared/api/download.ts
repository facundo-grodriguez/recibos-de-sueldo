import { ApiError } from './http';
import { emitUnauthorized } from './session-events';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

function extraerNombreArchivo(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  // Preferimos filename* (UTF-8, RFC 6266) si está: filename se manda en
  // paralelo como fallback ASCII para clientes viejos (ver backend, ADR-050).
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8) return decodeURIComponent(utf8[1]);
  const simple = /filename="([^"]+)"/i.exec(contentDisposition);
  return simple ? simple[1] : null;
}

/** Descarga un binario (PDF/ZIP) y dispara la descarga del navegador, respetando el nombre de archivo real del backend. */
export async function downloadFile(path: string, token: string | null, nombreSugerido: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (response.status === 401) {
    emitUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError('No se pudo descargar el archivo', response.status);
  }

  const blob = await response.blob();
  const nombre = extraerNombreArchivo(response.headers.get('Content-Disposition')) ?? nombreSugerido;

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
