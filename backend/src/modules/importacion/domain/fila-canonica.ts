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
  /**
   * true cuando el conector completó cuil/nombre/apellido heredándolos de una
   * fila ancla anterior del mismo empleado (ver excel-conector-importacion),
   * en vez de venir cargados en esta fila. Le indica al validador que no
   * evalúe esos tres campos por fila: el aviso de normalización ya se generó
   * una sola vez, en la fila ancla (ADR-072, opción B).
   */
  identidadHeredada?: boolean;
  /**
   * Datos de la ficha del empleado (etapa "primera importación"), crudos tal
   * cual vienen del Excel. Solo tienen valor en la fila ancla de cada
   * empleado (misma fila que trae cuil/nombre/apellido completos) — nunca se
   * heredan a las filas siguientes, a diferencia de la identidad: si no se
   * completan en la ancla, quedan ausentes para ese empleado en esta
   * importación. Se usan una única vez, al dar de alta un empleado NUEVO al
   * confirmar (ver ConfirmarImportacionUseCase) — nunca actualizan la ficha
   * de un empleado ya existente.
   */
  legajo?: string;
  categoria?: string;
  fechaIngreso?: string;
  banco?: string;
}
