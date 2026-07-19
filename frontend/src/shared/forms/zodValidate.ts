import type { ZodType } from 'zod';

/**
 * Adapta un schema de Zod al formato de validación de @mantine/form
 * (`{ campo: mensaje }`). No hay un resolver oficial en @mantine/form — este
 * helper chico evita sumar una dependencia solo para esto.
 */
export function zodValidate<T>(schema: ZodType<T>) {
  return (values: T): Record<string, string> => {
    const resultado = schema.safeParse(values);
    if (resultado.success) return {};

    const errores: Record<string, string> = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path.join('.');
      if (campo && !errores[campo]) {
        errores[campo] = issue.message;
      }
    }
    return errores;
  };
}
