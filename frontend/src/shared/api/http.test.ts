import { afterEach, describe, expect, it, vi } from 'vitest';
import * as sessionEvents from './session-events';
import { ApiError, request } from './http';

function mockFetch(response: { ok: boolean; status: number; body: unknown }): void {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  }) as unknown as typeof fetch;
}

describe('request', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('agrega el header Authorization cuando hay token', async () => {
    mockFetch({ ok: true, status: 200, body: { ok: true } });

    await request('/algo', { token: 'abc123' });

    const [, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });

  it('no agrega Authorization si no hay token', async () => {
    mockFetch({ ok: true, status: 200, body: {} });

    await request('/algo');

    const [, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('lanza ApiError con el mensaje del backend cuando la respuesta no es ok', async () => {
    mockFetch({ ok: false, status: 400, body: { message: 'CUIL inválido' } });

    await expect(request('/algo')).rejects.toThrow(ApiError);
  });

  it('junta un array de mensajes de Zod en un solo texto', async () => {
    mockFetch({ ok: false, status: 400, body: { message: ['el email es obligatorio', 'la clave es obligatoria'] } });

    await expect(request('/algo')).rejects.toThrow('el email es obligatorio; la clave es obligatoria');
  });

  it('avisa al AuthContext (emitUnauthorized) ante un 401', async () => {
    const spy = vi.spyOn(sessionEvents, 'emitUnauthorized');
    mockFetch({ ok: false, status: 401, body: { message: 'Unauthorized' } });

    await expect(request('/algo')).rejects.toThrow(ApiError);
    expect(spy).toHaveBeenCalled();
  });
});
