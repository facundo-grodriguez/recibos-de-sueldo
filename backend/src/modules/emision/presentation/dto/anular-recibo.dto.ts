import { z } from 'zod';

export const anularReciboSchema = z.object({
  motivo: z.string().min(1, 'El motivo de anulación es obligatorio'),
});

export type AnularReciboDto = z.infer<typeof anularReciboSchema>;
