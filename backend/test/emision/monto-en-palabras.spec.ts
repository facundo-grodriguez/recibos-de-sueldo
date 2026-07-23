import { describe, expect, it } from 'vitest';
import { montoEnPalabras } from '../../src/modules/emision/domain/monto-en-palabras';

describe('montoEnPalabras', () => {
  it('convierte cero', () => {
    expect(montoEnPalabras(0)).toBe('Cero pesos con 00/100');
  });

  it('convierte números especiales del 10 al 19', () => {
    expect(montoEnPalabras(16)).toBe('Dieciséis pesos con 00/100');
  });

  it('usa "veinti-" pegado para 21-29', () => {
    expect(montoEnPalabras(21)).toBe('Veintiuno pesos con 00/100');
  });

  it('usa "y" para decenas distintas de veinte (31-99)', () => {
    expect(montoEnPalabras(35)).toBe('Treinta y cinco pesos con 00/100');
  });

  it('usa "cien" exacto y "ciento X" para 101-199', () => {
    expect(montoEnPalabras(100)).toBe('Cien pesos con 00/100');
    expect(montoEnPalabras(101)).toBe('Ciento uno pesos con 00/100');
  });

  it('convierte miles', () => {
    expect(montoEnPalabras(714000)).toBe('Setecientos catorce mil pesos con 00/100');
  });

  it('usa "mil" sin "uno" para exactamente 1000', () => {
    expect(montoEnPalabras(1000)).toBe('Mil pesos con 00/100');
  });

  it('usa "un millón" (singular) y "N millones" (plural)', () => {
    expect(montoEnPalabras(1_000_000)).toBe('Un millón pesos con 00/100');
    expect(montoEnPalabras(2_000_000)).toBe('Dos millones pesos con 00/100');
  });

  it('incluye los centavos, con padding a 2 dígitos', () => {
    expect(montoEnPalabras(925778.5)).toBe('Novecientos veinticinco mil setecientos setenta y ocho pesos con 50/100');
    expect(montoEnPalabras(925778.99)).toBe('Novecientos veinticinco mil setecientos setenta y ocho pesos con 99/100');
  });

  it('redondea centavos con error de punto flotante', () => {
    // 0.1 + 0.2 no da exactamente 0.3 en punto flotante — el redondeo interno debe absorberlo.
    expect(montoEnPalabras(680225.01)).toBe('Seiscientos ochenta mil doscientos veinticinco pesos con 01/100');
  });

  it('combina millones, miles y centena en un monto real grande', () => {
    expect(montoEnPalabras(1234567)).toBe('Un millón doscientos treinta y cuatro mil quinientos sesenta y siete pesos con 00/100');
  });
});
