import { z } from 'zod';

export const actualizarEmpleadoSchema = z.object({
  categoria: z.string().min(1).optional(),
  fechaIngreso: z.coerce.date().optional(),
  legajo: z.string().min(1).optional(),
  banco: z.string().min(1).optional(),
});

export type ActualizarEmpleadoDto = z.infer<typeof actualizarEmpleadoSchema>;
