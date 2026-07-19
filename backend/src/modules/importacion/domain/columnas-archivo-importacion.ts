export const COLUMNAS_OBLIGATORIAS = ['cuil', 'nombre', 'apellido', 'concepto', 'monto'] as const;

/**
 * Nombre de columna → clave de comparación tolerante (mayúsculas/minúsculas y
 * espacios de más no deberían romper un archivo por lo demás válido). No se
 * fusiona con `normalizarConcepto` (mismo one-liner hoy) porque normalizan
 * cosas conceptualmente distintas: nombres de columna de un archivo vs.
 * nombres de concepto para el motor de mapeo.
 */
function normalizarEncabezado(encabezado: string): string {
  return encabezado.trim().toLowerCase();
}

/**
 * Punto único de tolerancia de encabezado, compartido por todos los
 * conectores (CSV, Excel, futuros): un registro crudo con las claves tal
 * cual vinieron del archivo (cualquier mayúscula/espacio) se normaliza a las
 * claves canónicas esperadas. Los valores se stringifican y recortan acá
 * (nunca antes) para que ningún conector tenga que repetir esa lógica.
 */
export function mapearRegistroPorEncabezado(registro: Record<string, unknown>): Record<string, string> {
  const normalizado: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(registro)) {
    if (valor === null || valor === undefined) {
      normalizado[normalizarEncabezado(clave)] = '';
      continue;
    }
    normalizado[normalizarEncabezado(clave)] = String(valor).trim();
  }
  return normalizado;
}

/** Columnas obligatorias (ya normalizadas) que faltan en un registro dado. */
export function columnasObligatoriasFaltantes(clavesDelArchivo: string[]): string[] {
  const clavesNormalizadas = clavesDelArchivo.map(normalizarEncabezado);
  return COLUMNAS_OBLIGATORIAS.filter((columna) => !clavesNormalizadas.includes(columna));
}
