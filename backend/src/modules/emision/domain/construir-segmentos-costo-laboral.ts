import { CATEGORIAS_CONTRIBUCION_ORDEN, COLOR_NETO } from './etiquetas-costo-laboral';
import { ReciboSnapshotDetalleCategoria, ReciboSnapshotSegmento } from './recibo-snapshot';

/**
 * Arma los gajos del gráfico de torta: revisión de diseño 2026-07-27 (ver
 * ADR en DECISIONS.md). Un gajo "Sueldo Neto" + un gajo por categoría
 * normativa con el monto COMBINADO (Empleador+Trabajador) de esa categoría —
 * mostrar el bruto como un único gajo (diseño anterior) escondía los aportes
 * del trabajador adentro; abrirlo en Neto + categorías combinadas es más
 * honesto con lo que cada parte puso, sin la complejidad extra de separar
 * cada categoría en dos gajos por lado.
 *
 * Una categoría sin ningún aporte patronal (`empleador === 0`, ej.
 * 'ganancias' — ADR-068, el empleador nunca aporta ahí) no consigue gajo
 * propio: mostrar su monto bajo su nombre real sería indistinguible de una
 * contribución patronal real que sí existe (el problema que motivó ADR-080).
 * Ese monto se redirige al gajo "Otros" en cambio — sin regla especial por
 * nombre de categoría, cualquier categoría sin aporte patronal cae ahí.
 *
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
    segmentos.push({ etiqueta: 'Sueldo Neto', monto: neto, porcentaje: porcentaje(neto), color: COLOR_NETO });
  }

  const detallePorCategoria = new Map(detalleComposicionSalarial.map((detalle) => [detalle.categoria, detalle]));

  let redirigidoAOtros = 0;
  for (const { categoria } of CATEGORIAS_CONTRIBUCION_ORDEN) {
    if (categoria === 'otros') continue;
    const detalle = detallePorCategoria.get(categoria);
    if (detalle && detalle.empleador === 0) {
      redirigidoAOtros += detalle.total;
    }
  }

  for (const { categoria, etiqueta, color } of CATEGORIAS_CONTRIBUCION_ORDEN) {
    if (categoria === 'otros') {
      const monto = (detallePorCategoria.get('otros')?.total ?? 0) + redirigidoAOtros;
      if (monto > 0) {
        segmentos.push({ etiqueta, monto, porcentaje: porcentaje(monto), color });
      }
      continue;
    }

    const detalle = detallePorCategoria.get(categoria);
    if (detalle && detalle.empleador > 0) {
      segmentos.push({ etiqueta, monto: detalle.total, porcentaje: porcentaje(detalle.total), color });
    }
  }

  return segmentos;
}
