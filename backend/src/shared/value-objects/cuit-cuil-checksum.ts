const VERIFICATION_MULTIPLIERS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Algoritmo módulo 11 compartido por CUIT y CUIL (mismo formato de 11 dígitos).
 * Se centraliza acá porque Cuit y Cuil son conceptos de dominio distintos
 * (empresa vs. persona) que comparten exactamente esta regla de validación.
 */
export function hasValidCuitCuilCheckDigit(digits: string): boolean {
  const numbers = digits.split('').map(Number);
  const checkDigit = numbers[10];

  const sum = VERIFICATION_MULTIPLIERS.reduce(
    (acc, multiplier, index) => acc + multiplier * numbers[index],
    0,
  );
  const remainder = sum % 11;
  const expected = remainder === 0 ? 0 : 11 - remainder;

  if (expected === 10) {
    return false;
  }

  return expected === checkDigit;
}
