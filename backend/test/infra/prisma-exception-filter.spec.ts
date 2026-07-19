import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaExceptionFilter } from '../../src/infra/errors/prisma-exception.filter';

function hostConMockResponse(): { host: ArgumentsHost; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

function errorPrisma(code: string, meta?: Record<string, unknown>): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mensaje interno de prisma con detalle de la query', {
    code,
    clientVersion: '5.22.0',
    meta,
  });
}

describe('PrismaExceptionFilter', () => {
  it('traduce una violación de restricción única (P2002) a 409 con un mensaje útil, sin exponer el detalle interno', () => {
    const filtro = new PrismaExceptionFilter();
    const { host, json, status } = hostConMockResponse();

    filtro.catch(errorPrisma('P2002', { target: ['email'] }), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const cuerpo = json.mock.calls[0][0];
    expect(cuerpo.statusCode).toBe(HttpStatus.CONFLICT);
    expect(cuerpo.message).not.toContain('prisma');
    expect(cuerpo.message).not.toContain('email');
  });

  it('responde 500 genérico (sin detalle interno) para cualquier otro código de Prisma no anticipado', () => {
    const filtro = new PrismaExceptionFilter();
    const { host, json, status } = hostConMockResponse();

    filtro.catch(errorPrisma('P2025'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const cuerpo = json.mock.calls[0][0];
    expect(cuerpo.message).toBe('Internal server error');
    expect(cuerpo.message).not.toContain('prisma');
  });
});
