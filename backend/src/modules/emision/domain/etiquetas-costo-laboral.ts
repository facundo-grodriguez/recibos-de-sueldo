import { CategoriaContribucion } from '../../../shared/value-objects/clasificacion-concepto';

// Paleta categórica validada (9 hues, orden fijo, no cíclico — ver skill de
// dataviz: CVD-safe en pares adyacentes, que es como se leen los gajos de
// una torta). Slot 1 para Sueldo Neto; slots 2-9 en el mismo orden en que
// el Anexo III lista las categorías. Desde la revisión de diseño del
// 2026-07-27 (ver ADR en DECISIONS.md), el gráfico de torta abre el costo
// laboral total en Sueldo Neto + un gajo por categoría con el monto
// COMBINADO (Empleador+Trabajador) de esa categoría — nunca separado por
// lado (más simple de leer que dos gajos por categoría). Una categoría sin
// ningún aporte patronal (ej. 'ganancias', ADR-068 — el empleador nunca
// aporta un peso ahí) no consigue gajo propio con su nombre: mostrarla
// combinada sería indistinguible de una contribución patronal real que sí
// existe (el problema que motivó ADR-080). En cambio, su monto se redirige
// al gajo "Otros" — categoría ya prevista para lo que no tiene identidad
// propia en la torta, en vez de inventar una regla especial por nombre de
// categoría.
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
