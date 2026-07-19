/**
 * Un recurso solicitado no existe (o no es visible para el usuario actual, en
 * cuyo caso se lanza igual este error para no filtrar existencia entre tenants).
 * La capa de Presentación lo mapea a HTTP 404.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
