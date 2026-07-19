import { describe, expect, it } from 'vitest';
import { Money } from '../../src/shared/value-objects/money';

describe('Money', () => {
  it('suma sin errores de redondeo de punto flotante', () => {
    const a = Money.fromDecimal(0.1);
    const b = Money.fromDecimal(0.2);
    expect(a.add(b).toDecimal()).toBe(0.3);
  });

  it('resta correctamente', () => {
    const total = Money.fromDecimal(100);
    const descuento = Money.fromDecimal(30.5);
    expect(total.subtract(descuento).toDecimal()).toBe(69.5);
  });

  it('zero() es neutro para la suma', () => {
    const monto = Money.fromDecimal(42.42);
    expect(monto.add(Money.zero()).equals(monto)).toBe(true);
  });

  it('rechaza centavos no enteros', () => {
    expect(() => Money.fromCents(10.5)).toThrow();
  });
});
