import { z } from 'zod';

export const importarArchivoSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

export type ImportarArchivoFormValues = z.infer<typeof importarArchivoSchema>;

// z.coerce.date(): el DatePickerInput de Mantine puede emitir un string
// "YYYY-MM-DD" (no un Date) al elegir una fecha del calendario — z.date()
// a secas rechazaría ese valor como inválido.
export const datosEmisionSchema = z.object({
  fechaPago: z.coerce.date().nullable(),
  lugarPago: z.string(),
  fechaPagoCargasSociales: z.coerce.date().nullable(),
  lugarPagoCargasSociales: z.string(),
});

export type DatosEmisionFormValues = z.infer<typeof datosEmisionSchema>;

export const corregirFilaSchema = z.object({
  cuil: z.string().min(1, 'Requerido'),
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  concepto: z.string().min(1, 'Requerido'),
  monto: z.string().min(1, 'Requerido'),
  unidad: z.string(),
  base: z.string(),
});

export type CorregirFilaFormValues = z.infer<typeof corregirFilaSchema>;
