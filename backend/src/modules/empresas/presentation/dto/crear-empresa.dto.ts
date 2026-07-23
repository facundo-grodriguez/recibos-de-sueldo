import { z } from 'zod';

export const crearEmpresaSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es obligatoria'),
  cuit: z.string().min(1, 'El CUIT es obligatorio'),
  nombreFantasia: z.string().optional(),
  // Obligatorio (a diferencia de localidad/provincia/CP, solo informativos):
  // el domicilio del empleador es parte de la información mínima para
  // reconstruir el Anexo III (docs/modelo-funcional-anexo-iii.md, sección
  // 10) y aparece impreso en el recibo. Se exige al crear la empresa —no
  // recién al emitir— porque es un dato de configuración único, conocido
  // desde el alta (a diferencia de la ficha de cada empleado, que se
  // completa progresivamente después de importar).
  domicilio: z.string().min(1, 'El domicilio es obligatorio'),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
});

export type CrearEmpresaDto = z.infer<typeof crearEmpresaSchema>;
