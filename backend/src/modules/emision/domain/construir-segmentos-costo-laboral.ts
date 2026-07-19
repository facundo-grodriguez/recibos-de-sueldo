import { CATEGORIAS_CONTRIBUCION_ORDEN, COLOR_NETO } from './etiquetas-costo-laboral';
import { ReciboSnapshotDetalleCategoria, ReciboSnapshotSegmento } from './recibo-snapshot';

/**
 * Arma los gajos del gráfico de torta (composición del costo laboral total),
 * siguiendo la lectura oficial del Anexo III (docs/modelo-funcional-anexo-iii.md,
 * sección 11): un gajo "Sueldo Neto" + un gajo por cada categoría normativa con
 * el costo COMBINADO Empleador+Trabajador (reutiliza los mismos totales que
 * "Detalle de la composición salarial"), no la contribución patronal cruda.
 * Los porcentajes son siempre sobre el costo laboral total.
 */
export function construirSegmentosCostoLaboral(
  detalleComposicionSalarial: ReciboSnapshotDetalleCategoria[],
  neto: number,
  costoLaboralTotal: number,
): ReciboSnapshotSegmento[] {
  const segmentos: ReciboSnapshotSegmento[] = [];
  const porcentaje = (monto: number): number => (costoLaboralTotal > 0 ? (monto / costoLaboralTotal) * 100 : 0);

  if (neto > 0) {
    segmentos.push({
      etiqueta: 'Sueldo Neto',
      monto: neto,
      porcentaje: porcentaje(neto),
      color: COLOR_NETO,
    });
  }

  const totalPorCategoria = new Map(detalleComposicionSalarial.map((detalle) => [detalle.categoria, detalle.total]));

  for (const { categoria, etiqueta, color } of CATEGORIAS_CONTRIBUCION_ORDEN) {
    const monto = totalPorCategoria.get(categoria) ?? 0;
    if (monto > 0) {
      segmentos.push({ etiqueta, monto, porcentaje: porcentaje(monto), color });
    }
  }

  return segmentos;
}
