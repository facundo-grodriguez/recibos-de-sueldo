import { z } from 'zod';

/** Espeja shared/value-objects/clasificacion-concepto.ts del backend. */
export const TIPOS_CONCEPTO = ['remunerativo', 'no_remunerativo', 'deduccion', 'contribucion_patronal'] as const;
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

export const ETIQUETAS_TIPO_CONCEPTO: Record<(typeof TIPOS_CONCEPTO)[number], string> = {
  remunerativo: 'Remunerativo',
  no_remunerativo: 'No remunerativo',
  deduccion: 'Deducción',
  contribucion_patronal: 'Contribución patronal',
};

export const ETIQUETAS_CATEGORIA_CONTRIBUCION: Record<(typeof CATEGORIAS_CONTRIBUCION)[number], string> = {
  sindical: 'Sindical',
  seguridad_social: 'Seguridad Social',
  obra_social: 'Obra Social',
  inssjp: 'INSSJP',
  art: 'ART',
  camaras_empresariales: 'Cámaras Empresariales',
  otros: 'Otros',
  ganancias: 'Impuesto a las Ganancias',
};

export const definirMapeoSchema = z
  .object({
    concepto: z.string().min(1),
    tipo: z.enum(TIPOS_CONCEPTO),
    categoriaContribucion: z.enum(CATEGORIAS_CONTRIBUCION).optional(),
  })
  .refine((datos) => datos.tipo !== 'contribucion_patronal' || datos.categoriaContribucion !== undefined, {
    message: 'Una contribución patronal necesita una categoría',
    path: ['categoriaContribucion'],
  });

export type DefinirMapeoFormValues = z.infer<typeof definirMapeoSchema>;
