import { describe, expect, it } from 'vitest';
import { Cuit } from '../../src/shared/value-objects/cuit';
import { DomainError } from '../../src/shared/errors/domain-error';

describe('Cuit', () => {
  it('acepta un CUIT con dígito verificador correcto', () => {
    const cuit = Cuit.create('20123456786');
    expect(cuit.value).toBe('20123456786');
    expect(cuit.formatted).toBe('20-12345678-6');
  });

  it('acepta un CUIT con guiones y lo normaliza', () => {
    const cuit = Cuit.create('20-12345678-6');
    expect(cuit.value).toBe('20123456786');
  });

  it('rechaza un CUIT con longitud incorrecta', () => {
    expect(() => Cuit.create('123')).toThrow(DomainError);
  });

  it('rechaza un CUIT con dígito verificador incorrecto', () => {
    expect(() => Cuit.create('20123456780')).toThrow(DomainError);
  });
});
