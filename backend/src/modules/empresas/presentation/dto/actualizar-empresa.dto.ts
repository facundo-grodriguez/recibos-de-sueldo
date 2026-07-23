import { z } from 'zod';

export const actualizarEmpresaSchema = z
  .object({
    razonSocial: z.string().min(1, 'La razón social es obligatoria').optional(),
    cuit: z.string().min(1, 'El CUIT es obligatorio').optional(),
    nombreFantasia: z.string().optional(),
    // Optional en el sentido de "no hace falta reenviarlo en cada PATCH" —
    // pero si se envía, no puede quedar vacío (ver crear-empresa.dto.ts:
    // el domicilio es obligatorio para el Anexo III).
    domicilio: z.string().min(1, 'El domicilio es obligatorio').optional(),
    localidad: z.string().optional(),
    provincia: z.string().optional(),
    codigoPostal: z.string().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'Debe indicarse al menos un campo a actualizar',
  });

export type ActualizarEmpresaDto = z.infer<typeof actualizarEmpresaSchema>;
