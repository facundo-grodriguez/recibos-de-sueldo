import { describe, expect, it } from 'vitest';
import { Cuil } from '../../src/shared/value-objects/cuil';
import { DomainError } from '../../src/shared/errors/domain-error';

describe('Cuil', () => {
  it('acepta un CUIL con dígito verificador correcto', () => {
    const cuil = Cuil.create('27309876542');
    expect(cuil.value).toBe('27309876542');
    expect(cuil.formatted).toBe('27-30987654-2');
  });

  it('rechaza un CUIL con dígito verificador incorrecto', () => {
    expect(() => Cuil.create('27309876540')).toThrow(DomainError);
  });

  it('rechaza un CUIL vacío', () => {
    expect(() => Cuil.create('')).toThrow(DomainError);
  });
});
