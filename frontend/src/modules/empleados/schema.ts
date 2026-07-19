import { z } from 'zod';

/** Espeja crear-empleado.dto.ts — la identidad del empleado (nombre/apellido/cuil) no se edita después de creado. */
export const crearEmpleadoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  cuil: z.string().min(1, 'El CUIL es obligatorio'),
});

export type CrearEmpleadoFormValues = z.infer<typeof crearEmpleadoSchema>;

/**
 * Espeja actualizar-empleado.dto.ts — la ficha (Fase 4), no la identidad.
 * z.coerce.date(): el DatePickerInput de Mantine puede emitir un string
 * "YYYY-MM-DD" (no un Date) al elegir una fecha del calendario — z.date()
 * a secas rechazaría ese valor como inválido.
 */
export const editarEmpleadoSchema = z.object({
  categoria: z.string().optional(),
  fechaIngreso: z.coerce.date().nullable().optional(),
  legajo: z.string().optional(),
  banco: z.string().optional(),
});

export type EditarEmpleadoFormValues = z.infer<typeof editarEmpleadoSchema>;
