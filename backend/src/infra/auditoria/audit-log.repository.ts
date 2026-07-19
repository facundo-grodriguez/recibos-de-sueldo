export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  entidad: string;
  entidadId: string;
  accion: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  usuarioId: string | null;
}

export interface AuditLogRepository {
  /** Historial de auditoría de una entidad puntual, ordenado cronológicamente. */
  findByEntidad(entidad: string, entidadId: string): Promise<AuditLogEntry[]>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AuditLogRepository');
