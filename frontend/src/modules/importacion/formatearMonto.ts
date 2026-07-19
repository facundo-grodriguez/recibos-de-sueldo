import { formatearMoneda } from '../../shared/format/formatearMoneda';

/** Si el monto no se pudo parsear (fila inválida), muestra el texto crudo tal cual venía en el archivo. */
export function formatearMonto(monto: number | null, montoOriginal: string): string {
  if (monto === null) return montoOriginal;
  return formatearMoneda(monto);
}
