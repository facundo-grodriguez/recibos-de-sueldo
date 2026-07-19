import { DomainError } from '../errors/domain-error';
import { hasValidCuitCuilCheckDigit } from './cuit-cuil-checksum';

/**
 * CUIT argentino (identifica a la Empresa): 11 dígitos con dígito verificador módulo 11.
 * Se valida el formato y el dígito verificador en la construcción; nunca existe
 * una instancia inválida (invariante de dominio).
 */
export class Cuit {
  private constructor(private readonly digits: string) {}

  static create(raw: string): Cuit {
    const digits = raw.replace(/[^0-9]/g, '');

    if (digits.length !== 11) {
      throw new DomainError(`CUIT inválido: debe tener 11 dígitos ("${raw}")`);
    }

    if (!hasValidCuitCuilCheckDigit(digits)) {
      throw new DomainError(`CUIT inválido: dígito verificador incorrecto ("${raw}")`);
    }

    return new Cuit(digits);
  }

  get value(): string {
    return this.digits;
  }

  get formatted(): string {
    return `${this.digits.slice(0, 2)}-${this.digits.slice(2, 10)}-${this.digits.slice(10)}`;
  }

  equals(other: Cuit): boolean {
    return this.digits === other.digits;
  }

  toString(): string {
    return this.formatted;
  }
}
