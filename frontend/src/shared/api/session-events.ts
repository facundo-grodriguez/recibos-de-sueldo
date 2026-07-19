/**
 * Puente mínimo entre el cliente HTTP (fuera de React) y el AuthContext
 * (adentro de React): evita que `http.ts` tenga que importar el contexto de
 * auth solo para poder cerrar la sesión ante un 401.
 */
let handler: (() => void) | null = null;

export function onUnauthorized(nuevoHandler: () => void): void {
  handler = nuevoHandler;
}

export function emitUnauthorized(): void {
  handler?.();
}
