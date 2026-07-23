import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AdminRegistrationGuard } from '../../src/modules/auth/presentation/admin-registration.guard';

const TOKEN_VALIDO = 'un-token-secreto-de-al-menos-16-caracteres';

function contexto(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function configConToken(token: string): ConfigService {
  return { getOrThrow: () => token } as unknown as ConfigService;
}

describe('AdminRegistrationGuard', () => {
  it('permite el registro si el header trae el token correcto', () => {
    const guard = new AdminRegistrationGuard(configConToken(TOKEN_VALIDO));

    expect(guard.canActivate(contexto({ 'x-admin-registration-token': TOKEN_VALIDO }))).toBe(true);
  });

  it('rechaza si falta el header', () => {
    const guard = new AdminRegistrationGuard(configConToken(TOKEN_VALIDO));

    expect(() => guard.canActivate(contexto({}))).toThrow(ForbiddenException);
  });

  it('rechaza si el token no coincide', () => {
    const guard = new AdminRegistrationGuard(configConToken(TOKEN_VALIDO));

    expect(() => guard.canActivate(contexto({ 'x-admin-registration-token': 'token-incorrecto' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza un token de distinto largo sin romper (comparación segura)', () => {
    const guard = new AdminRegistrationGuard(configConToken(TOKEN_VALIDO));

    expect(() => guard.canActivate(contexto({ 'x-admin-registration-token': 'corto' }))).toThrow(ForbiddenException);
  });

  it('rechaza si el header viene vacío', () => {
    const guard = new AdminRegistrationGuard(configConToken(TOKEN_VALIDO));

    expect(() => guard.canActivate(contexto({ 'x-admin-registration-token': '' }))).toThrow(ForbiddenException);
  });
});
