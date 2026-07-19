import { describe, expect, it } from 'vitest';
import { calcularAntiguedad } from '../../src/modules/emision/domain/calcular-antiguedad';

describe('calcularAntiguedad', () => {
  it('devuelve años y meses cuando hay de ambos', () => {
    expect(calcularAntiguedad(new Date('2024-01-10'), new Date('2026-07-17'))).toBe('2 años y 6 meses');
  });

  it('no muestra meses cuando el aniversario cae justo en la fecha de referencia', () => {
    expect(calcularAntiguedad(new Date('2025-07-17'), new Date('2026-07-17'))).toBe('1 año');
  });

  it('usa singular para 1 año y 1 mes', () => {
    expect(calcularAntiguedad(new Date('2025-06-17'), new Date('2026-07-17'))).toBe('1 año y 1 mes');
  });

  it('muestra solo meses cuando hay menos de un año', () => {
    expect(calcularAntiguedad(new Date('2026-01-17'), new Date('2026-07-17'))).toBe('6 meses');
  });

  it('resta un mes si todavía no se cumplió el día del aniversario', () => {
    expect(calcularAntiguedad(new Date('2026-06-20'), new Date('2026-07-17'))).toBe('0 meses');
  });

  it('muestra "0 meses" para un ingreso el mismo día de referencia', () => {
    expect(calcularAntiguedad(new Date('2026-07-17'), new Date('2026-07-17'))).toBe('0 meses');
  });

  it('no devuelve una antigüedad negativa si el ingreso es posterior a la referencia', () => {
    expect(calcularAntiguedad(new Date('2027-01-01'), new Date('2026-07-17'))).toBe('0 meses');
  });
});
