import { describe, expect, it } from 'vitest';
import { parsearFechaLocal } from './parsearFechaLocal';

describe('parsearFechaLocal', () => {
  it('devuelve una fecha local con el mismo año/mes/día que el string, sin desfase por zona horaria', () => {
    const fecha = parsearFechaLocal('2016-10-12');

    expect(fecha.getFullYear()).toBe(2016);
    expect(fecha.getMonth()).toBe(9); // octubre = índice 9
    expect(fecha.getDate()).toBe(12);
  });

});
