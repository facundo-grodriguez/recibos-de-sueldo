import { z } from 'zod';

/** Espeja los DTOs del backend (crear/actualizar-empresa.dto.ts) — duplicado a propósito, ver plan de frontend. */
export const empresaFormSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es obligatoria'),
  cuit: z.string().min(1, 'El CUIT es obligatorio'),
  nombreFantasia: z.string().optional(),
  domicilio: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
});

export type EmpresaFormValues = z.infer<typeof empresaFormSchema>;
