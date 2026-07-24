import { describe, expect, it } from 'vitest';
import { parsearFechaTolerante } from '../../src/shared/utils/parsear-fecha-tolerante';

describe('parsearFechaTolerante', () => {
  it('parsea formato argentino dd/mm/yyyy', () => {
    const fecha = parsearFechaTolerante('15/05/2015');
    expect(fecha?.getUTCFullYear()).toBe(2015);
    expect(fecha?.getUTCMonth()).toBe(4); // mayo = índice 4
    expect(fecha?.getUTCDate()).toBe(15);
  });

  it('parsea formato argentino con guiones dd-mm-yyyy', () => {
    const fecha = parsearFechaTolerante('01-12-2020');
    expect(fecha?.getUTCFullYear()).toBe(2020);
    expect(fecha?.getUTCMonth()).toBe(11);
    expect(fecha?.getUTCDate()).toBe(1);
  });

  it('parsea formato ISO (celda de fecha real de Excel)', () => {
    const fecha = parsearFechaTolerante('2015-05-15T00:00:00.000Z');
    expect(fecha?.toISOString()).toBe('2015-05-15T00:00:00.000Z');
  });

  it('tolera día/mes de un solo dígito', () => {
    const fecha = parsearFechaTolerante('5/3/2018');
    expect(fecha?.getUTCMonth()).toBe(2);
    expect(fecha?.getUTCDate()).toBe(5);
  });

  it('devuelve null para una fecha que desborda (31 de febrero)', () => {
    expect(parsearFechaTolerante('31/02/2020')).toBeNull();
  });

  it('devuelve null para mes o día fuera de rango', () => {
    expect(parsearFechaTolerante('15/13/2020')).toBeNull();
    expect(parsearFechaTolerante('32/01/2020')).toBeNull();
  });

  it('devuelve null para texto no interpretable, sin lanzar', () => {
    expect(parsearFechaTolerante('hace 10 años')).toBeNull();
    expect(parsearFechaTolerante('2015')).toBeNull();
  });

  it('devuelve null para vacío, null o undefined', () => {
    expect(parsearFechaTolerante('')).toBeNull();
    expect(parsearFechaTolerante('   ')).toBeNull();
    expect(parsearFechaTolerante(null)).toBeNull();
    expect(parsearFechaTolerante(undefined)).toBeNull();
  });
});
