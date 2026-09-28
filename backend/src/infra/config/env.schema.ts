import { z } from 'zod';

/**
 * Único punto de verdad para las variables de entorno. Falla rápido al
 * bootstrapear si falta o es inválida una variable requerida, en vez de
 * fallar más tarde y de forma confusa en el punto de uso.
 */

// Mismo string que .env.example (backend/ y raíz de app/) — si production
// arranca con este valor tal cual, es que alguien copió el ejemplo sin
// generar uno propio. "cambiar-"/"change-me" cubre variantes futuras del
// placeholder sin tener que mantener esta lista en sincronía a mano.
const VALOR_DE_EJEMPLO = 'change-me-to-a-random-secret-of-at-least-16-chars';

function pareceValorDeEjemplo(valor: string): boolean {
  return valor === VALOR_DE_EJEMPLO || /^(cambiar|change-me)[-_]/i.test(valor);
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    // Cierra el registro público (ver AdminRegistrationGuard): sin este token
    // en el header `X-Admin-Registration-Token`, POST /auth/register se
    // rechaza. Solo lo conoce quien administra la instancia.
    ADMIN_REGISTRATION_TOKEN: z.string().min(16, 'ADMIN_REGISTRATION_TOKEN debe tener al menos 16 caracteres'),
  })
  .superRefine((config, ctx) => {
    // Solo en producción: en development/test, arrancar con los valores de
    // .env.example es exactamente el flujo esperado (nadie genera secretos
    // propios para tirar la base de desarrollo).
    if (config.NODE_ENV !== 'production') return;

    if (pareceValorDeEjemplo(config.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET sigue siendo el valor de ejemplo de .env.example — generá uno propio antes de arrancar en producción (ver README, sección "Seguridad y credenciales")',
      });
    }
    if (pareceValorDeEjemplo(config.ADMIN_REGISTRATION_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_REGISTRATION_TOKEN'],
        message:
          'ADMIN_REGISTRATION_TOKEN sigue siendo el valor de ejemplo de .env.example — generá uno propio antes de arrancar en producción (ver README, sección "Seguridad y credenciales")',
      });
    }
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
