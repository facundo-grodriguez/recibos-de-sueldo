import { z } from 'zod';

/**
 * Único punto de verdad para las variables de entorno. Falla rápido al
 * bootstrapear si falta o es inválida una variable requerida, en vez de
 * fallar más tarde y de forma confusa en el punto de uso.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Configuración de entorno inválida:\n${issues.join('\n')}`);
  }
  return result.data;
}
