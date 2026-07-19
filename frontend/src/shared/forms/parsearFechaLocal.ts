/**
 * Convierte una fecha "YYYY-MM-DD" (como las devuelve el backend, ej.
 * `fechaIngreso`) en un `Date` de medianoche LOCAL, no UTC. `new Date('2016-10-12')`
 * interpreta el string como medianoche UTC — en un huso horario negativo
 * (ej. Argentina, UTC-3) eso se muestra como el día anterior en cualquier
 * date picker, que siempre renderiza en hora local. Nunca usar el
 * constructor de `Date` directo sobre un string "solo fecha" del backend.
 */
export function parsearFechaLocal(fechaIso: string): Date {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}
