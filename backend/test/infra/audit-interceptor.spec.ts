import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuditInterceptor } from '../../src/infra/auditoria/audit.interceptor';
import { AUDITABLE_METADATA_KEY, AuditableMetadata } from '../../src/infra/auditoria/auditable.decorator';

function crearContexto(usuarioId: string, method = 'POST'): ExecutionContext {
  const request = { method, user: { id: usuarioId } };
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function crearHandler(valor: unknown): CallHandler {
  return { handle: () => of(valor) };
}

function crearReflector(metadata: AuditableMetadata | undefined): Reflector {
  return {
    get: (key: string) => (key === AUDITABLE_METADATA_KEY ? metadata : undefined),
  } as unknown as Reflector;
}

describe('AuditInterceptor', () => {
  it('registra un log por cada elemento cuando el resultado del endpoint es un array (ej. emitir recibos en lote)', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const prisma = { auditLog: { create } } as never;
    const interceptor = new AuditInterceptor(crearReflector({ entidad: 'Recibo', accion: 'emitir' }), prisma);

    const resultado$ = interceptor.intercept(
      crearContexto('usuario-1'),
      crearHandler([{ id: 'recibo-1' }, { id: 'recibo-2' }]),
    );
    await new Promise<void>((resolve) => resultado$.subscribe({ complete: resolve }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith({
      data: { usuarioId: 'usuario-1', entidad: 'Recibo', accion: 'emitir', entidadId: 'recibo-1' },
    });
    expect(create).toHaveBeenCalledWith({
      data: { usuarioId: 'usuario-1', entidad: 'Recibo', accion: 'emitir', entidadId: 'recibo-2' },
    });
  });

  it('registra un solo log cuando el resultado es un objeto (comportamiento previo, sin regresión)', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const prisma = { auditLog: { create } } as never;
    const interceptor = new AuditInterceptor(crearReflector({ entidad: 'Empresa' }), prisma);

    const resultado$ = interceptor.intercept(crearContexto('usuario-1'), crearHandler({ id: 'empresa-1' }));
    await new Promise<void>((resolve) => resultado$.subscribe({ complete: resolve }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: { usuarioId: 'usuario-1', entidad: 'Empresa', accion: 'crear', entidadId: 'empresa-1' },
    });
  });

  it('no registra nada si el endpoint no tiene metadata @Auditable', async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const prisma = { auditLog: { create } } as never;
    const interceptor = new AuditInterceptor(crearReflector(undefined), prisma);

    const resultado$ = interceptor.intercept(crearContexto('usuario-1'), crearHandler({ id: 'x' }));
    await new Promise<void>((resolve) => resultado$.subscribe({ complete: resolve }));

    expect(create).not.toHaveBeenCalled();
  });
});
