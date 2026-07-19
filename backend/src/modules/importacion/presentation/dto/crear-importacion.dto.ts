import { z } from 'zod';

export const crearImportacionSchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

export type CrearImportacionDto = z.infer<typeof crearImportacionSchema>;
