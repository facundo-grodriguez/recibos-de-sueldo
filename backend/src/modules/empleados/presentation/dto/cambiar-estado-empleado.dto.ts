import { z } from 'zod';

export const cambiarEstadoEmpleadoSchema = z.object({
  estado: z.enum(['activo', 'inactivo']),
});

export type CambiarEstadoEmpleadoDto = z.infer<typeof cambiarEstadoEmpleadoSchema>;
