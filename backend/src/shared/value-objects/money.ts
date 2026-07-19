import { DomainError } from '../errors/domain-error';

/**
 * Representa un monto monetario en centavos (entero), nunca en punto flotante,
 * para evitar errores de redondeo (ver docs/constitucion-tecnica.md, fuera de este repo).
 */
export class Money {
  private constructor(private readonly amountInCents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new DomainError(`Money inválido: los centavos deben ser un entero (${cents})`);
    }
    return new Money(cents);
  }

  static fromDecimal(amount: number): Money {
    return Money.fromCents(Math.round(amount * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.amountInCents + other.amountInCents);
  }

  subtract(other: Money): Money {
    return new Money(this.amountInCents - other.amountInCents);
  }

  get cents(): number {
    return this.amountInCents;
  }

  toDecimal(): number {
    return this.amountInCents / 100;
  }

  equals(other: Money): boolean {
    return this.amountInCents === other.amountInCents;
  }

  toString(): string {
    return this.toDecimal().toFixed(2);
  }
}
