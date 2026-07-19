import { z } from 'zod';

export const actualizarDatosEmisionSchema = z.object({
  fechaPago: z.coerce.date().optional(),
  lugarPago: z.string().min(1).optional(),
  fechaPagoCargasSociales: z.coerce.date().optional(),
  lugarPagoCargasSociales: z.string().min(1).optional(),
});

export type ActualizarDatosEmisionDto = z.infer<typeof actualizarDatosEmisionSchema>;
