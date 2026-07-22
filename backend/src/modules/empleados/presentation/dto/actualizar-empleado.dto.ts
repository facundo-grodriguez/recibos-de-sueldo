import { z } from 'zod';

export const actualizarEmpleadoSchema = z.object({
  // Corrección manual de un typo (ADR-077: nombre/apellido se modifican por "alta; corrección manual" —
  // a diferencia del CUIL, que es la llave inmutable y no se edita nunca por acá).
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  categoria: z.string().min(1).optional(),
  fechaIngreso: z.coerce.date().optional(),
  legajo: z.string().min(1).optional(),
  banco: z.string().min(1).optional(),
});

export type ActualizarEmpleadoDto = z.infer<typeof actualizarEmpleadoSchema>;
