import { CategoriaContribucion } from '../../../shared/value-objects/clasificacion-concepto';

// Paleta categórica validada (9 slots, orden fijo, no cíclico — ver skill de
// dataviz: CVD-safe en pares adyacentes, que es como se leen los gajos de
// una torta). Slot 1 para Sueldo Bruto; slots 2-9 en el mismo orden en que
// el Anexo III lista las categorías. El gráfico de torta representa
// pura y exclusivamente el gasto del empleador (Sueldo Bruto + contribución
// patronal cruda por categoría, sin combinar con la deducción del
// trabajador) — el cruce Empleador/Trabajador se aclara aparte, en el
// "Detalle de composición salarial" (decisión de producto, 2026-07-23,
// reemplaza la lectura "oficial" combinada de ADR-056). 'ganancias'
// (ADR-068) nunca es una contribución patronal real (ver
// clasificacion-concepto.ts) — su columna "Empleador" siempre es $0, así
// que nunca aparece como gajo del gráfico (si aparece en el detalle de
// composición, sí, como deducción pura del trabajador).
export const COLOR_BRUTO = '#2a78d6';

export const CATEGORIAS_CONTRIBUCION_ORDEN: Array<{
  categoria: CategoriaContribucion;
  etiqueta: string;
  color: string;
}> = [
  { categoria: 'sindical', etiqueta: 'Sindical', color: '#008300' },
  { categoria: 'seguridad_social', etiqueta: 'Seguridad Social', color: '#e87ba4' },
  { categoria: 'obra_social', etiqueta: 'Obra Social', color: '#eda100' },
  { categoria: 'inssjp', etiqueta: 'INSSJP (PAMI)', color: '#1baf7a' },
  { categoria: 'art', etiqueta: 'ART', color: '#eb6834' },
  { categoria: 'camaras_empresariales', etiqueta: 'Cámaras Empresariales', color: '#4a3aa7' },
  { categoria: 'otros', etiqueta: 'Otros', color: '#e34948' },
  { categoria: 'ganancias', etiqueta: 'Impuesto a las Ganancias', color: '#a8348c' },
];
