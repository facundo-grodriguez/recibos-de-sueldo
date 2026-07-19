import { describe, expect, it } from 'vitest';
import { formatearMonto } from './formatearMonto';

describe('formatearMonto', () => {
  it('formatea un monto válido como moneda ARS', () => {
    expect(formatearMonto(1500.5, '1500.50')).toMatch(/\$\s*1\.500,50/);
  });

  it('muestra el texto crudo del archivo cuando el monto no se pudo parsear (fila inválida)', () => {
    expect(formatearMonto(null, 'no-es-un-numero')).toBe('no-es-un-numero');
  });
});
