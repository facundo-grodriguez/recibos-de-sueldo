import { z } from 'zod';

export const crearEmpresaSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es obligatoria'),
  cuit: z.string().min(1, 'El CUIT es obligatorio'),
  nombreFantasia: z.string().optional(),
  domicilio: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
});

export type CrearEmpresaDto = z.infer<typeof crearEmpresaSchema>;
