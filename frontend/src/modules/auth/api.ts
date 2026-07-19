import { request } from '../../shared/api/http';
import type { RegisterFormValues } from './schema';

export interface LoginResponse {
  accessToken: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  nombre: string;
  aceptoTerminosEn: string | null;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function register(datos: RegisterFormValues): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: datos,
  });
}
