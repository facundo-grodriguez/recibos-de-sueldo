import { CategoriaContribucion } from '../../../shared/value-objects/clasificacion-concepto';

// Paleta categórica validada (9 slots, orden fijo, no cíclico — ver skill de
// dataviz: CVD-safe en pares adyacentes, que es como se leen los gajos de
// una torta). Slot 1 para Sueldo Neto; slots 2-9 en el mismo orden en que
// el Anexo III lista las categorías (lectura oficial del gráfico, ver
// docs/modelo-funcional-anexo-iii.md, sección 11). 'ganancias' (ADR-068) es
// el 9° slot: no aparece nunca como contribución patronal real (ver
// clasificacion-concepto.ts), solo como categoría de una deducción, así que
// en el gráfico de torta y en el detalle de composición salarial su columna
// "Empleador" siempre queda en $0 — igual que el resto del código ya tolera
// categorías sin ningún concepto (ver plantilla-recibo.ts).
export const COLOR_NETO = '#2a78d6';

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
