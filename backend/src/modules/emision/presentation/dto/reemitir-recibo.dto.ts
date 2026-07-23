import { z } from 'zod';

const cambiosFilaSchema = z.object({
  cuil: z.string().min(1).optional(),
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  concepto: z.string().min(1).optional(),
  monto: z.string().min(1).optional(),
  unidad: z.string().min(1).optional(),
  base: z.string().min(1).optional(),
});

export const reemitirReciboSchema = z.object({
  // Ninguno de los dos es obligatorio: reemitir sin body sigue funcionando
  // igual que antes (repite el recibo tal cual), esto es solo para el caso
  // de corregir un dato puntual antes de generar el reemplazo.
  ajustes: z
    .array(z.object({ filaId: z.string().min(1), cambios: cambiosFilaSchema }))
    .optional(),
});

export type ReemitirReciboDto = z.infer<typeof reemitirReciboSchema>;
