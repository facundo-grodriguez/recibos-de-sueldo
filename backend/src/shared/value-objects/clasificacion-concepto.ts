import { DomainError } from '../errors/domain-error';

export const TIPOS_CONCEPTO = [
  'remunerativo',
  'no_remunerativo',
  'deduccion',
  'contribucion_patronal',
] as const;
export type TipoConcepto = (typeof TIPOS_CONCEPTO)[number];

// Las 7 categorías de contribución patronal exigidas por el Anexo III (Decreto 407/2026).
export const CATEGORIAS_CONTRIBUCION = [
  'sindical',
  'seguridad_social',
  'obra_social',
  'inssjp',
  'art',
  'camaras_empresariales',
  'otros',
] as const;
export type CategoriaContribucion = (typeof CATEGORIAS_CONTRIBUCION)[number];

/**
 * Clasificación normativa de un concepto. `categoriaContribucion`:
 * - Obligatoria cuando `tipo === 'contribucion_patronal'`.
 * - Opcional cuando `tipo === 'deduccion'` (Fase de rediseño de plantilla):
 *   permite cruzar, en el "Detalle de composición salarial", cuánto puso el
 *   empleador y cuánto puso el trabajador de la misma categoría (ej.
 *   Seguridad Social). No toda deducción encaja en una categoría del Anexo
 *   III (ej. un adelanto), así que acá queda nula.
 * - Siempre nula para `remunerativo`/`no_remunerativo`.
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

    if (tipo === 'contribucion_patronal') {
      if (!categoriaContribucion || !(CATEGORIAS_CONTRIBUCION as readonly string[]).includes(categoriaContribucion)) {
        throw new DomainError(
          `Una contribución patronal requiere una categoría válida: ${CATEGORIAS_CONTRIBUCION.join(', ')}`,
        );
      }
      return new ClasificacionConcepto(tipo as TipoConcepto, categoriaContribucion as CategoriaContribucion);
    }

    if (tipo === 'deduccion') {
      if (categoriaContribucion && !(CATEGORIAS_CONTRIBUCION as readonly string[]).includes(categoriaContribucion)) {
        throw new DomainError(`Categoría de contribución inválida: ${CATEGORIAS_CONTRIBUCION.join(', ')}`);
      }
      return new ClasificacionConcepto(tipo as TipoConcepto, (categoriaContribucion as CategoriaContribucion) || null);
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
