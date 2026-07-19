import { z } from 'zod';

export const crearEmpleadoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  cuil: z.string().min(1, 'El CUIL es obligatorio'),
});

export type CrearEmpleadoDto = z.infer<typeof crearEmpleadoSchema>;
