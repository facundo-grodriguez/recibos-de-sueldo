/**
 * Puerto de salida: el algoritmo concreto (argon2) vive en Infraestructura.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(hash: string, plainPassword: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
