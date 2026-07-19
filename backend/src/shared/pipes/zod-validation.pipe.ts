import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Validación en el borde (capa de Presentación): el DTO nunca llega al caso de
 * uso si no cumple el schema. Las invariantes de negocio, en cambio, viven en
 * el Dominio (ver docs/constitucion-tecnica.md, fuera de este repo).
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw new BadRequestException(issues);
    }
    return result.data;
  }
}
