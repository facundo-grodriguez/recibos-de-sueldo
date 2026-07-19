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

export interface CrearAuditLogEntryData {
  entidad: string;
  entidadId: string;
  accion: string;
  usuarioId: string | null;
  /** Diff campo a campo, cuando el caso de uso lo conoce (ver ADR-058/064). */
  campo?: string | null;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
}

export interface AuditLogRepository {
  /** Historial de auditoría de una entidad puntual, ordenado cronológicamente. */
  findByEntidad(entidad: string, entidadId: string): Promise<AuditLogEntry[]>;
  /**
   * Registro directo desde un caso de uso que sí conoce el diff campo a
   * campo — a diferencia de `AuditInterceptor` (transversal, genérico,
   * sin acceso al valor anterior).
   */
  create(data: CrearAuditLogEntryData): Promise<void>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AuditLogRepository');
