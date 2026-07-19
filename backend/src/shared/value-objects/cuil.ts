import { DomainError } from '../errors/domain-error';
import { hasValidCuitCuilCheckDigit } from './cuit-cuil-checksum';

/**
 * CUIL argentino (identifica al Empleado): mismo formato y algoritmo de
 * validación que el CUIT, pero es un concepto de dominio distinto (persona vs. empresa).
 */
export class Cuil {
  private constructor(private readonly digits: string) {}

  static create(raw: string): Cuil {
    const digits = raw.replace(/[^0-9]/g, '');

    if (digits.length !== 11) {
      throw new DomainError(`CUIL inválido: debe tener 11 dígitos ("${raw}")`);
    }

    if (!hasValidCuitCuilCheckDigit(digits)) {
      throw new DomainError(`CUIL inválido: dígito verificador incorrecto ("${raw}")`);
    }

    return new Cuil(digits);
  }

  get value(): string {
    return this.digits;
  }

  get formatted(): string {
    return `${this.digits.slice(0, 2)}-${this.digits.slice(2, 10)}-${this.digits.slice(10)}`;
  }

  equals(other: Cuil): boolean {
    return this.digits === other.digits;
  }

  toString(): string {
    return this.formatted;
  }
}
