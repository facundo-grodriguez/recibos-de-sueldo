import { describe, expect, it } from 'vitest';
import { validateEnv } from '../../src/infra/config/env.schema';

function configBase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://recibos:recibos@localhost:5433/recibos?schema=public',
    JWT_SECRET: 'un-secreto-propio-generado-de-verdad',
    ADMIN_REGISTRATION_TOKEN: 'otro-secreto-propio-generado-de-verdad',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('en producción, rechaza JWT_SECRET si es el valor de ejemplo de .env.example', () => {
    const config = configBase({
      NODE_ENV: 'production',
      JWT_SECRET: 'change-me-to-a-random-secret-of-at-least-16-chars',
    });

    expect(() => validateEnv(config)).toThrow(/JWT_SECRET/);
  });

  it('en producción, rechaza ADMIN_REGISTRATION_TOKEN si es el valor de ejemplo de .env.example', () => {
    const config = configBase({
      NODE_ENV: 'production',
      ADMIN_REGISTRATION_TOKEN: 'change-me-to-a-random-secret-of-at-least-16-chars',
    });

    expect(() => validateEnv(config)).toThrow(/ADMIN_REGISTRATION_TOKEN/);
  });

  it('en producción, rechaza un placeholder tipo "cambiar-..." aunque no sea el texto exacto del ejemplo', () => {
    const config = configBase({
      NODE_ENV: 'production',
      JWT_SECRET: 'cambiar-esto-antes-de-produccion',
    });

    expect(() => validateEnv(config)).toThrow(/JWT_SECRET/);
  });

  it('en producción, acepta valores propios que no son el ejemplo', () => {
    const config = configBase({ NODE_ENV: 'production' });

    const resultado = validateEnv(config);

    expect(resultado.JWT_SECRET).toBe(config.JWT_SECRET);
    expect(resultado.ADMIN_REGISTRATION_TOKEN).toBe(config.ADMIN_REGISTRATION_TOKEN);
  });

  it('en development, no bloquea aunque los secretos sean el valor de ejemplo', () => {
    const config = configBase({
      NODE_ENV: 'development',
      JWT_SECRET: 'change-me-to-a-random-secret-of-at-least-16-chars',
      ADMIN_REGISTRATION_TOKEN: 'change-me-to-a-random-secret-of-at-least-16-chars',
    });

    expect(() => validateEnv(config)).not.toThrow();
  });

  it('en test, no bloquea aunque los secretos sean el valor de ejemplo', () => {
    const config = configBase({
      NODE_ENV: 'test',
      JWT_SECRET: 'change-me-to-a-random-secret-of-at-least-16-chars',
      ADMIN_REGISTRATION_TOKEN: 'change-me-to-a-random-secret-of-at-least-16-chars',
    });

    expect(() => validateEnv(config)).not.toThrow();
  });
});
