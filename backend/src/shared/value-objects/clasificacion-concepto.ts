import { DomainError } from '../errors/domain-error';

// Regla del proyecto (ADR-069): agregar un tipo acá NO es un cambio local.
// Impacta al menos estos 2 lugares, ambos con una guarda que rompe a
// propósito si no se actualizan (nunca confiar en acordarse solo):
// - calcular-totales-empleado.ts: switch exhaustivo (`default: never`) — el
//   build falla en compilación si el tipo nuevo no se suma a un total.
// - plantilla-recibo.ts: `validarCoberturaCompleta` — la emisión falla en
//   runtime si el tipo nuevo no queda representado en ninguna tabla.
// Antes de agregar un tipo, revisar ambos (y cualquier otro lugar que
// ramifique sobre `tipo` sin pasar por un switch/filtro exhaustivo).
export const TIPOS_CONCEPTO = [
  'remunerativo',
  'no_remunerativo',
  'deduccion',
  'contribucion_patronal',
] as const;
export type TipoConcepto = (typeof TIPOS_CONCEPTO)[number];

// Las 7 categorías de contribución patronal exigidas por el Anexo III (Decreto
// 407/2026), más 'ganancias' (Impuesto a las Ganancias — ADR-068): a
// diferencia de las otras 7, nunca es una contribución patronal real (ningún
// empleador aporta Ganancias), solo aplica a una deducción. Se agrega igual a
// esta única lista (en vez de crear una lista aparte) porque
// `categoriaContribucion` es el mismo campo para ambos tipos — no hace falta
// una segunda enumeración para un caso que el tipo ya contempla. 'otros' es
// la categoría residual real para lo que no encaje en ninguna categoría
// normativa (ADR-069) — nunca un cajón para "no lo clasifiqué".
export const CATEGORIAS_CONTRIBUCION = [
  'sindical',
  'seguridad_social',
  'obra_social',
  'inssjp',
  'art',
  'camaras_empresariales',
  'otros',
  'ganancias',
] as const;
export type CategoriaContribucion = (typeof CATEGORIAS_CONTRIBUCION)[number];

/**
 * Clasificación normativa de un concepto. `categoriaContribucion`:
 * - Obligatoria cuando `tipo === 'contribucion_patronal'` o
 *   `tipo === 'deduccion'` (ADR-069): todo concepto con impacto económico en
 *   el costo laboral queda clasificado por definición del modelo, no como
 *   parche para que una suma cierre. Permite cruzar, en el "Detalle de
 *   composición salarial" y en el gráfico de torta, cuánto puso el empleador
 *   y cuánto puso el trabajador de la misma categoría (ej. Seguridad
 *   Social). 'otros' es la categoría residual para lo que no encaje en
 *   ninguna categoría normativa (ej. un adelanto) — siempre disponible,
 *   nunca bloquea la clasificación.
 * - Siempre nula para `remunerativo`/`no_remunerativo` (no participan del
 *   costo laboral por categoría).
 */
export class ClasificacionConcepto {
  private constructor(
    public readonly tipo: TipoConcepto,
    public readonly categoriaContribucion: CategoriaContribucion | null,
  ) {}

  static create(tipo: string, categoriaContribucion: string | null): ClasificacionConcepto {
    if (!(TIPOS_CONCEPTO as readonly string[]).includes(tipo)) {
      throw new DomainError(
        `Tipo de concepto inválido: "${tipo}". Debe ser uno de: ${TIPOS_CONCEPTO.join(', ')}`,
      );
    }

    if (tipo === 'contribucion_patronal' || tipo === 'deduccion') {
      if (!categoriaContribucion || !(CATEGORIAS_CONTRIBUCION as readonly string[]).includes(categoriaContribucion)) {
        throw new DomainError(
          `Un concepto de tipo "${tipo}" requiere una categoría válida: ${CATEGORIAS_CONTRIBUCION.join(', ')}`,
        );
      }
      return new ClasificacionConcepto(tipo as TipoConcepto, categoriaContribucion as CategoriaContribucion);
    }

    if (categoriaContribucion) {
      throw new DomainError(
        'La categoría de contribución solo aplica a conceptos de tipo "contribucion_patronal" o "deduccion"',
      );
    }

    return new ClasificacionConcepto(tipo as TipoConcepto, null);
  }

  equals(other: ClasificacionConcepto): boolean {
    return this.tipo === other.tipo && this.categoriaContribucion === other.categoriaContribucion;
  }
}
