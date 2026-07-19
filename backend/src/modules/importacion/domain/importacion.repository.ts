import { Importacion } from './importacion.entity';

export interface CrearImportacionFilaData {
  numeroFila: number;
  cuil: string;
  nombre: string;
  apellido: string;
  concepto: string;
  montoOriginal: string;
  monto: number | null;
  valida: boolean;
  errorMensaje: string | null;
  unidad?: string | null;
  base?: number | null;
  correcciones?: string[];
}

/** Corrección puntual de una fila ya existente (sin re-subir el archivo) — mismos campos que al crearla, salvo `numeroFila` (la fila no cambia de identidad). */
export interface ActualizarFilaData {
  cuil: string;
  nombre: string;
  apellido: string;
  concepto: string;
  montoOriginal: string;
  monto: number | null;
  valida: boolean;
  errorMensaje: string | null;
  unidad?: string | null;
  base?: number | null;
  correcciones?: string[];
}

export interface CrearImportacionData {
  empresaId: string;
  usuarioId: string;
  anio: number;
  mes: number;
  nombreArchivo: string;
  filas: CrearImportacionFilaData[];
}

export interface AplicarClasificacionData {
  tipo: string;
  categoriaContribucion: string | null;
}

export interface ActualizarDatosEmisionData {
  fechaPago?: Date;
  lugarPago?: string;
  fechaPagoCargasSociales?: Date;
  lugarPagoCargasSociales?: string;
}

export interface ImportacionRepository {
  create(data: CrearImportacionData): Promise<Importacion>;
  /** Todas las importaciones de la empresa (cualquier estado), de la más reciente a la más vieja. */
  findAllByEmpresa(empresaId: string): Promise<Importacion[]>;
  findByIdAndEmpresa(id: string, empresaId: string): Promise<Importacion | null>;
  marcarConfirmada(id: string): Promise<Importacion>;
  /** Corrige una fila puntual y devuelve la importación completa recién releída (mismo patrón que marcarConfirmada/actualizarDatosEmision). */
  actualizarFila(filaId: string, data: ActualizarFilaData): Promise<Importacion>;
  actualizarDatosEmision(id: string, data: ActualizarDatosEmisionData): Promise<Importacion>;
  /**
   * Clasifica todas las filas válidas y todavía sin clasificar de ese concepto
   * (normalizado) en TODA la empresa, no solo en una importación puntual —
   * es lo que hace "reutilizable" al mapeo. Devuelve la cantidad de filas actualizadas.
   */
  aplicarClasificacion(
    empresaId: string,
    conceptoNormalizado: string,
    clasificacion: AplicarClasificacionData,
  ): Promise<number>;
  /** Conceptos (texto original) de filas válidas todavía sin clasificar, para esa empresa. */
  listarConceptosPendientes(empresaId: string): Promise<string[]>;
  /**
   * Todas las filas válidas y sin clasificar de la empresa, agrupadas por
   * concepto normalizado (ids de fila por grupo) — una única consulta.
   * Reemplaza, para el caso de clasificar varios conceptos de una sola vez
   * (ver `ConfirmarImportacionUseCase`), el patrón de llamar
   * `aplicarClasificacion` (que escanea TODA la empresa) una vez por cada
   * concepto — perfil de rendimiento, 2026-07-19.
   */
  agruparFilasSinClasificarPorConcepto(empresaId: string): Promise<Map<string, string[]>>;
  /** Aplica una clasificación a filas ya identificadas por id, sin volver a escanear la empresa. */
  actualizarClasificacionPorIds(ids: string[], clasificacion: AplicarClasificacionData): Promise<number>;
  /**
   * Importaciones ya confirmadas de la empresa, con período (año/mes)
   * estrictamente anterior al indicado, ordenadas de la más reciente a la
   * más vieja. Se usa para comparar el neto de un empleado contra su
   * período anterior (Fase 3: Validación). Acotado a un puñado de períodos
   * recientes (ver implementación) — nunca trae todo el historial confirmado
   * de la empresa, solo lo necesario para encontrar el primer período donde
   * el empleado ya esté clasificado.
   */
  findConfirmadasAnteriores(empresaId: string, anio: number, mes: number): Promise<Importacion[]>;
}

export const IMPORTACION_REPOSITORY = Symbol('ImportacionRepository');
