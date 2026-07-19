import { z } from 'zod';

/** Espeja register.dto.ts del backend. */
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  aceptaTerminos: z.boolean().refine((valor) => valor === true, {
    message: 'Debés aceptar los Términos y Condiciones y el Acuerdo de Tratamiento de Datos',
  }),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
