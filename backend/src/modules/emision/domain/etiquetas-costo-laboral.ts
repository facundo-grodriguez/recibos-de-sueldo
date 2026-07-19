import { CategoriaContribucion } from '../../../shared/value-objects/clasificacion-concepto';

// Paleta categórica validada (8 slots, orden fijo, no cíclico — ver skill de
// dataviz: CVD-safe en pares adyacentes, que es como se leen los gajos de
// una torta). Slot 1 para Sueldo Neto; slots 2-8 en el mismo orden en que
// el Anexo III lista las categorías (lectura oficial del gráfico, ver
// docs/modelo-funcional-anexo-iii.md, sección 11).
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
];
