/**
 * Una fila tal como la produce cualquier conector (CSV, Excel, ...), antes de
 * validar. Formato largo: una fila = un empleado + un concepto. Todos los
 * campos llegan como texto crudo, tal cual estaban en el archivo de origen.
 */
export interface FilaCanonica {
  numeroFila: number;
  cuil: string;
  nombre: string;
  apellido: string;
  concepto: string;
  monto: string;
  /**
   * Columnas opcionales de auditoría de cálculo (ej. "30" días, "11%"), tal
   * cual vienen del archivo de origen. El adaptador no las valida ni las usa
   * para calcular `monto` — son solo informativas para que el recibo final
   * muestre cómo se llegó a ese monto (ver plantilla oficial de referencia).
   */
  unidad?: string;
  base?: string;
}
