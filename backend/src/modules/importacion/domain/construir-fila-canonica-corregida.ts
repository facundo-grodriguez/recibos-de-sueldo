import { FilaCanonica } from './fila-canonica';
import { ImportacionFila } from './importacion-fila.entity';

export interface CambiosFilaImportacion {
  cuil?: string;
  nombre?: string;
  apellido?: string;
  concepto?: string;
  monto?: string;
  unidad?: string;
  base?: string;
}

/**
 * Mezcla los cambios pedidos sobre los valores crudos actuales de la fila,
 * para revalidarla como si fuera una fila recién parseada — misma regla de
 * negocio (`validarFilaImportacion`) tanto para "Corregir fila" (persiste el
 * resultado) como para el ajuste puntual al reemitir un recibo (nunca
 * persiste, ver ReemitirReciboUseCase).
 */
export function construirFilaCanonicaCorregida(
  filaActual: ImportacionFila,
  cambios: CambiosFilaImportacion,
): FilaCanonica {
  return {
    numeroFila: filaActual.numeroFila,
    cuil: cambios.cuil ?? filaActual.cuil,
    nombre: cambios.nombre ?? filaActual.nombre,
    apellido: cambios.apellido ?? filaActual.apellido,
    concepto: cambios.concepto ?? filaActual.concepto,
    monto: cambios.monto ?? filaActual.montoOriginal,
    unidad: cambios.unidad ?? filaActual.unidad ?? undefined,
    base: cambios.base ?? (filaActual.base === null ? undefined : String(filaActual.base)),
  };
}
