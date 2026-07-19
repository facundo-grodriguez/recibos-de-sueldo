/**
 * Puerto de salida: emisión de tokens de sesión. La librería concreta (JWT)
 * es un detalle de Infraestructura.
 */
export interface TokenIssuer {
  issue(payload: { usuarioId: string; email: string }): string;
}

export const TOKEN_ISSUER = Symbol('TokenIssuer');
