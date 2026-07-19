import { AuditLogEntry } from '../../../infra/auditoria/audit-log.repository';
import { PerfilMapeoConcepto } from '../domain/perfil-mapeo-concepto.entity';

export interface PerfilMapeoConceptoResponse {
  id: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export function toPerfilMapeoResponse(perfil: PerfilMapeoConcepto): PerfilMapeoConceptoResponse {
  return {
    id: perfil.id,
    concepto: perfil.conceptoOriginal,
    tipo: perfil.clasificacion.tipo,
    categoriaContribucion: perfil.clasificacion.categoriaContribucion,
  };
}

export interface AuditoriaMapeoResponse {
  id: string;
  timestamp: string;
  accion: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

export function toAuditoriaMapeoResponse(entrada: AuditLogEntry): AuditoriaMapeoResponse {
  return {
    id: entrada.id,
    timestamp: entrada.timestamp.toISOString(),
    accion: entrada.accion,
    campo: entrada.campo,
    valorAnterior: entrada.valorAnterior,
    valorNuevo: entrada.valorNuevo,
  };
}
