import { AuditLogEntry } from '../../../infra/auditoria/audit-log.repository';
import { Recibo } from '../domain/recibo.entity';

export interface ReciboResponse {
  id: string;
  numero: number;
  importacionId: string;
  empleadoId: string;
  cuil: string;
  nombre: string;
  apellido: string;
  neto: number;
  costoLaboralTotal: number;
  hashIntegridad: string;
  fechaEmision: string;
  estado: string;
  motivoAnulacion: string | null;
  reemplazaAId: string | null;
}

export function toReciboResponse(recibo: Recibo): ReciboResponse {
  return {
    id: recibo.id,
    numero: recibo.numero,
    importacionId: recibo.importacionId,
    empleadoId: recibo.empleadoId,
    cuil: recibo.snapshot.empleado.cuil,
    nombre: recibo.snapshot.empleado.nombre,
    apellido: recibo.snapshot.empleado.apellido,
    neto: recibo.snapshot.totales.neto,
    costoLaboralTotal: recibo.snapshot.totales.costoLaboralTotal,
    hashIntegridad: recibo.hashIntegridad,
    fechaEmision: recibo.fechaEmision.toISOString(),
    estado: recibo.estado,
    motivoAnulacion: recibo.motivoAnulacion,
    reemplazaAId: recibo.reemplazaAId,
  };
}

export interface AuditoriaReciboResponse {
  id: string;
  timestamp: string;
  accion: string;
}

// campo/valorAnterior/valorNuevo quedan sin poblar por el interceptor de
// auditoría transversal (ver audit.interceptor.ts) hasta que exista un caso
// de uso que registre el diff campo a campo — no se exponen todavía.
export function toAuditoriaReciboResponse(entrada: AuditLogEntry): AuditoriaReciboResponse {
  return {
    id: entrada.id,
    timestamp: entrada.timestamp.toISOString(),
    accion: entrada.accion,
  };
}
