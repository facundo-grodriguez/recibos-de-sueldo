/**
 * Error de una regla o invariante de dominio violada. La capa de Presentación
 * lo mapea a HTTP 400/422; nunca debe propagarse como error 500 genérico.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
