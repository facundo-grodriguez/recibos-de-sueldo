import { ReciboSnapshot } from './recibo-snapshot';
import { Recibo } from './recibo.entity';

export interface CrearReciboData {
  importacionId: string;
  empleadoId: string;
  numero: number;
  snapshot: ReciboSnapshot;
  pdfPath: string;
  hashIntegridad: string;
  /** Presente solo cuando este recibo nace como reemplazo de uno anulado. */
  reemplazaAId?: string;
}

export interface ReciboFiltroEmpresa {
  empleadoId?: string;
  /** 1-indexada. Por defecto la primera página (ver `PAGINA_POR_DEFECTO`). */
  pagina?: number;
  /** Por defecto `TAMANIO_PAGINA_HISTORIAL_POR_DEFECTO`. */
  porPagina?: number;
}

export interface ReciboHistorialPagina {
  recibos: Recibo[];
  /** Total de recibos que matchean el filtro, sin paginar — para calcular cuántas páginas hay. */
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ReciboRepository {
  create(data: CrearReciboData): Promise<Recibo>;
  /**
   * Igual que `create`, pero además registra la entrada de auditoría
   * "emitir" en la misma transacción de base de datos — el recibo nunca
   * queda persistido sin su rastro de auditoría, ni al revés (ver ADR-066).
   * `usuarioId` puede ser `null` si el contexto de ejecución no tiene un
   * usuario autenticado disponible (no debería pasar en la práctica, pero
   * `AuditLog.usuarioId` ya es nullable).
   */
  crearConAuditoria(data: CrearReciboData, usuarioId: string | null): Promise<Recibo>;
  /** Todos los recibos de la importación, vigentes y anulados. */
  findAllByImportacion(importacionId: string): Promise<Recibo[]>;
  /** Solo los recibos vigentes de la importación (vista por defecto). */
  findVigentesByImportacion(importacionId: string): Promise<Recibo[]>;
  findByIdAndImportacion(id: string, importacionId: string): Promise<Recibo | null>;
  /**
   * Historial completo de la empresa, cruzando todas sus importaciones —
   * paginado (perfil de rendimiento, prueba de carga 2026-07-19: el listado
   * sin paginar ya mostró cientos de filas sin virtualizar en el frontend).
   */
  findAllByEmpresa(empresaId: string, filtro?: ReciboFiltroEmpresa): Promise<ReciboHistorialPagina>;
  /** El recibo (si existe) que reemplaza al recibo anulado indicado. */
  findByReemplazaAId(reciboId: string): Promise<Recibo | null>;
  /** Para numerar recibos de forma correlativa por empresa. */
  contarPorEmpresa(empresaId: string): Promise<number>;
  anular(id: string, motivo: string): Promise<Recibo>;
}

export const RECIBO_REPOSITORY = Symbol('ReciboRepository');
