import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';
import { CategoriaContribucion } from '../../../shared/value-objects/clasificacion-concepto';
import { CATEGORIAS_CONTRIBUCION_ORDEN } from './etiquetas-costo-laboral';
import { ReciboSnapshotDetalleCategoria } from './recibo-snapshot';

/**
 * Cruza, por categoría normativa (Sindical, Seguridad Social, Obra Social,
 * ART, etc.), cuánto puso el empleador (contribución patronal) contra cuánto
 * se le retuvo al trabajador (deducción con esa misma categoría) — sección
 * "Detalle de la composición salarial" de la plantilla oficial. Mismo orden
 * fijo del Anexo III que el resto del recibo (ver ADR-039/046); las
 * categorías sin ningún monto (ni empleador ni trabajador) no se incluyen.
 *
 * Desde ADR-069, `categoriaContribucion` es obligatoria para
 * `contribucion_patronal` y `deduccion` (nunca nula) por invariante de
 * `ClasificacionConcepto.create` — el filtro de categoría nula de acá abajo
 * queda como red de seguridad ante datos de una importación previa a esa
 * migración, no como un caso esperado.
 */
export function construirDetalleComposicionSalarial(filas: ImportacionFila[]): ReciboSnapshotDetalleCategoria[] {
  const porCategoria = new Map<CategoriaContribucion, { empleador: number; trabajador: number }>();

  for (const fila of filas) {
    if (!fila.valida || fila.monto === null || !fila.clasificacion) continue;

    const { tipo, categoriaContribucion } = fila.clasificacion;
    if (!categoriaContribucion) continue;
    if (tipo !== 'contribucion_patronal' && tipo !== 'deduccion') continue;

    const acumulado = porCategoria.get(categoriaContribucion) ?? { empleador: 0, trabajador: 0 };
    if (tipo === 'contribucion_patronal') {
      acumulado.empleador += fila.monto;
    } else {
      acumulado.trabajador += fila.monto;
    }
    porCategoria.set(categoriaContribucion, acumulado);
  }

  return CATEGORIAS_CONTRIBUCION_ORDEN.filter(({ categoria }) => porCategoria.has(categoria)).map(
    ({ categoria, etiqueta }) => {
      const { empleador, trabajador } = porCategoria.get(categoria) as { empleador: number; trabajador: number };
      return { categoria, etiqueta, empleador, trabajador, total: empleador + trabajador };
    },
  );
}
