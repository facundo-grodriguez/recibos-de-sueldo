import { emitUnauthorized } from './session-events';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: unknown;
}

async function parseErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === 'object' && 'message' in body) {
    const mensaje = (body as { message: unknown }).message;
    return Array.isArray(mensaje) ? mensaje.join('; ') : String(mensaje);
  }
  return 'Error de comunicación con el servidor';
}

/** Cliente HTTP tipado: agrega el header de autenticación si hay token, y avisa al AuthContext ante un 401 (ver session-events). */
export async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { token, body, headers, ...resto } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...resto,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    emitUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

/** Multipart (subida de archivos): sin Content-Type manual, el browser arma el boundary solo. */
export async function requestFormData<TResponse>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (response.status === 401) {
    emitUnauthorized();
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as TResponse;
}
