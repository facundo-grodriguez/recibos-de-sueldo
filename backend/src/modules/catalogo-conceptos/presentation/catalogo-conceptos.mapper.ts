import { AuditLogEntry } from '../../../infra/auditoria/audit-log.repository';
import { ConceptoCatalogo } from '../domain/concepto-catalogo.entity';

export interface ConceptoCatalogoResponse {
  id: string;
  concepto: string;
  tipo: string;
  categoriaContribucion: string | null;
}

export function toConceptoCatalogoResponse(concepto: ConceptoCatalogo): ConceptoCatalogoResponse {
  return {
    id: concepto.id,
    concepto: concepto.conceptoOriginal,
    tipo: concepto.clasificacion.tipo,
    categoriaContribucion: concepto.clasificacion.categoriaContribucion,
  };
}

export interface AuditoriaConceptoCatalogoResponse {
  id: string;
  timestamp: string;
  accion: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

export function toAuditoriaConceptoCatalogoResponse(entrada: AuditLogEntry): AuditoriaConceptoCatalogoResponse {
  return {
    id: entrada.id,
    timestamp: entrada.timestamp.toISOString(),
    accion: entrada.accion,
    campo: entrada.campo,
    valorAnterior: entrada.valorAnterior,
    valorNuevo: entrada.valorNuevo,
  };
}
