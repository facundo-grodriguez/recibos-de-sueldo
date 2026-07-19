import { z } from 'zod';

export const corregirFilaImportacionSchema = z
  .object({
    cuil: z.string().min(1).optional(),
    nombre: z.string().min(1).optional(),
    apellido: z.string().min(1).optional(),
    concepto: z.string().min(1).optional(),
    monto: z.string().min(1).optional(),
    unidad: z.string().min(1).optional(),
    base: z.string().min(1).optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'Debe indicarse al menos un campo a corregir',
  });

export type CorregirFilaImportacionDto = z.infer<typeof corregirFilaImportacionSchema>;
