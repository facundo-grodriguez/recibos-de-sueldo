import { z } from 'zod';
import { CATEGORIAS_CONTRIBUCION, TIPOS_CONCEPTO } from '../../../../shared/value-objects/clasificacion-concepto';

export const definirMapeoSchema = z.object({
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  tipo: z.enum(TIPOS_CONCEPTO),
  categoriaContribucion: z.enum(CATEGORIAS_CONTRIBUCION).optional(),
});

export type DefinirMapeoDto = z.infer<typeof definirMapeoSchema>;
