import { z } from 'zod';

/** Espeja crear-empleado.dto.ts — el CUIL es la llave y nunca se edita después de creado (ADR-077). */
export const crearEmpleadoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  cuil: z.string().min(1, 'El CUIL es obligatorio'),
});

export type CrearEmpleadoFormValues = z.infer<typeof crearEmpleadoSchema>;

/**
 * Espeja actualizar-empleado.dto.ts — la ficha (Fase 4) + nombre/apellido (corrección manual de un
 * typo, ADR-077/Etapa 3). El CUIL sigue sin editarse por acá, es la llave inmutable.
 * z.coerce.date(): el DatePickerInput de Mantine puede emitir un string
 * "YYYY-MM-DD" (no un Date) al elegir una fecha del calendario — z.date()
 * a secas rechazaría ese valor como inválido.
 */
export const editarEmpleadoSchema = z.object({
  nombre: z.string().min(1, 'El nombre no puede quedar vacío').optional(),
  apellido: z.string().min(1, 'El apellido no puede quedar vacío').optional(),
  categoria: z.string().optional(),
  fechaIngreso: z.coerce
    .date()
    .nullable()
    .optional()
    .refine((fecha) => !fecha || fecha <= new Date(), 'La fecha de ingreso no puede ser posterior a hoy'),
  legajo: z.string().optional(),
  banco: z.string().optional(),
});

export type EditarEmpleadoFormValues = z.infer<typeof editarEmpleadoSchema>;
