import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_METADATA_KEY = 'auditable:metadata';

export interface AuditableMetadata {
  entidad: string;
  accion?: string;
}

/**
 * Marca un endpoint mutante para que el AuditInterceptor registre la acción.
 * El nombre de entidad debe coincidir con el modelo de Prisma auditado (ej. "Empresa").
 * `accion` es opcional: si no se indica, el interceptor la infiere del método
 * HTTP (POST→crear, PUT/PATCH→modificar, DELETE→eliminar). Se indica
 * explícitamente cuando un endpoint POST no es una alta real (ej. "confirmar"
 * una importación), para que el audit log no diga "crear" donde no corresponde.
 */
export const Auditable = (entidad: string, accion?: string) =>
  SetMetadata(AUDITABLE_METADATA_KEY, { entidad, accion } satisfies AuditableMetadata);
