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
}

export interface ReciboRepository {
  create(data: CrearReciboData): Promise<Recibo>;
  /** Todos los recibos de la importación, vigentes y anulados. */
  findAllByImportacion(importacionId: string): Promise<Recibo[]>;
  /** Solo los recibos vigentes de la importación (vista por defecto). */
  findVigentesByImportacion(importacionId: string): Promise<Recibo[]>;
  findByIdAndImportacion(id: string, importacionId: string): Promise<Recibo | null>;
  /** Historial completo de la empresa, cruzando todas sus importaciones. */
  findAllByEmpresa(empresaId: string, filtro?: ReciboFiltroEmpresa): Promise<Recibo[]>;
  /** El recibo (si existe) que reemplaza al recibo anulado indicado. */
  findByReemplazaAId(reciboId: string): Promise<Recibo | null>;
  /** Para numerar recibos de forma correlativa por empresa. */
  contarPorEmpresa(empresaId: string): Promise<number>;
  anular(id: string, motivo: string): Promise<Recibo>;
}

export const RECIBO_REPOSITORY = Symbol('ReciboRepository');
