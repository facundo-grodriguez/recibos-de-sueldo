import { z } from 'zod';

/** Espeja register.dto.ts del backend. `adminToken` no viaja en el body: se
 * manda como header `X-Admin-Registration-Token` (ver api.ts) — el registro
 * está cerrado al público desde la Tarea 5 del plan de piloto. */
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  aceptaTerminos: z.boolean().refine((valor) => valor === true, {
    message: 'Debés aceptar los Términos y Condiciones y el Acuerdo de Tratamiento de Datos',
  }),
  adminToken: z.string().min(1, 'Falta el token de administración'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
