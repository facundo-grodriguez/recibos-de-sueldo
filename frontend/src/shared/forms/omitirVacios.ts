/**
 * Convierte cadenas vacías y valores nulos/indefinidos (ej. una fecha
 * borrada en un date picker) en ausentes antes de mandar un PATCH: los
 * campos opcionales del backend son "no tocar si no viene" (`undefined`),
 * nunca "vaciar" (`''`/`null`) — ningún DTO del backend acepta hoy limpiar
 * un campo explícitamente, solo dejarlo como está u omitirlo.
 */
export function omitirVacios<T extends Record<string, unknown>>(valores: T): Partial<T> {
  const limpio: Partial<T> = {};
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== '' && valor !== null && valor !== undefined) {
      limpio[clave as keyof T] = valor as T[keyof T];
    }
  }
  return limpio;
}
