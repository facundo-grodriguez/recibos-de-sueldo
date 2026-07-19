/**
 * Clave de comparación para "el mismo concepto" entre archivos distintos
 * (ej. "Sueldo Básico" y "sueldo básico " deben matchear el mismo mapeo).
 * El texto original se conserva sin tocar para mostrarlo en la UI.
 */
export function normalizarConcepto(texto: string): string {
  return texto.trim().toLowerCase();
}
