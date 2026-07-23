import { CATEGORIAS_CONTRIBUCION_ORDEN, COLOR_BRUTO } from './etiquetas-costo-laboral';
import { ReciboSnapshotDetalleCategoria, ReciboSnapshotSegmento } from './recibo-snapshot';

/**
 * Arma los gajos del gráfico de torta: pura y exclusivamente el gasto del
 * empleador (decisión de producto, 2026-07-23) — un gajo "Sueldo Bruto"
 * (lo que el empleador paga como salario, de donde salen tanto el neto del
 * trabajador como sus propias deducciones) + un gajo por cada categoría
 * normativa con la contribución patronal CRUDA (nunca combinada con la
 * deducción del trabajador de esa misma categoría). El cruce
 * Empleador/Trabajador se aclara aparte, en "Detalle de composición
 * salarial" (`construirDetalleComposicionSalarial`), no en el gráfico.
 *
 * Una categoría sin ningún aporte patronal (ej. 'ganancias', que nunca es
 * contribución patronal real — ver ADR-068) no genera gajo: ese monto ya
 * está contado dentro de "Sueldo Bruto", igual que cualquier otra deducción
 * del trabajador. Los porcentajes son siempre sobre el costo laboral total.
 */
export function construirSegmentosCostoLaboral(
  detalleComposicionSalarial: ReciboSnapshotDetalleCategoria[],
  bruto: number,
  costoLaboralTotal: number,
): ReciboSnapshotSegmento[] {
  const segmentos: ReciboSnapshotSegmento[] = [];
  const porcentaje = (monto: number): number => (costoLaboralTotal > 0 ? (monto / costoLaboralTotal) * 100 : 0);

  if (bruto > 0) {
    segmentos.push({
      etiqueta: 'Sueldo Bruto',
      monto: bruto,
      porcentaje: porcentaje(bruto),
      color: COLOR_BRUTO,
    });
  }

  const empleadorPorCategoria = new Map(
    detalleComposicionSalarial.map((detalle) => [detalle.categoria, detalle.empleador]),
  );

  for (const { categoria, etiqueta, color } of CATEGORIAS_CONTRIBUCION_ORDEN) {
    const monto = empleadorPorCategoria.get(categoria) ?? 0;
    if (monto > 0) {
      segmentos.push({ etiqueta, monto, porcentaje: porcentaje(monto), color });
    }
  }

  return segmentos;
}
