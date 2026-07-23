import { z } from 'zod';

/** Espeja los DTOs del backend (crear/actualizar-empresa.dto.ts) — duplicado a propósito, ver plan de frontend. */
export const empresaFormSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es obligatoria'),
  cuit: z.string().min(1, 'El CUIT es obligatorio'),
  nombreFantasia: z.string().optional(),
  // Obligatorio: es parte de la información mínima para reconstruir el
  // Anexo III y aparece impreso en el recibo (ver crear-empresa.dto.ts en el
  // backend).
  domicilio: z.string().min(1, 'El domicilio es obligatorio'),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
});

export type EmpresaFormValues = z.infer<typeof empresaFormSchema>;
