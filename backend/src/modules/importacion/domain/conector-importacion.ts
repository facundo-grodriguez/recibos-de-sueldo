import { FilaCanonica } from './fila-canonica';

/**
 * Observación sobre el propio proceso de traducción de un adaptador (ej. "el
 * CUIL de la fila 8 se heredó de la fila 7") — nunca un dato de dominio.
 * Vive fuera de `FilaCanonica` a propósito (ADR-072): el contrato mínimo es
 * agnóstico del origen, nunca contiene información sobre cómo un adaptador
 * llegó a un valor. Se identifica por `numeroFila` para que la capa de
 * aplicación la fusione con las correcciones que ya genera
 * `validarFilaImportacion` (mismo canal visible para el usuario).
 */
export interface CorreccionAdaptador {
  numeroFila: number;
  mensaje: string;
}

export interface ResultadoParseoConector {
  filas: FilaCanonica[];
  correcciones: CorreccionAdaptador[];
}

/**
 * Puerto de salida: el núcleo acepta un único formato oficial de entrada,
 * el Excel Oficial de Importación v1 (ver docs/contrato-excel-oficial-importacion.md,
 * fuera de este repo) — transforma ese archivo en filas canónicas. Integraciones
 * con otros sistemas de liquidación se resuelven como conectores externos al
 * núcleo (ver ADR-054), que traducen su formato de origen a este Excel oficial;
 * no agregan un formato nuevo acá.
 *
 * Se mantiene como puerto (no inline) para permitir un v2 del contrato el día
 * de mañana sin tocar el resto del núcleo — no es indirección para elegir
 * entre formatos hoy, ya que solo hay uno.
 *
 * Debe lanzar DomainError ante un archivo estructuralmente inválido
 * (encabezados faltantes, archivo vacío, etc.).
 */
export interface ConectorImportacion {
  parse(buffer: Buffer): Promise<ResultadoParseoConector>;
}

export const CONECTOR_IMPORTACION_EXCEL = Symbol('ConectorImportacionExcel');

/** Única extensión aceptada por el Excel Oficial de Importación v1. */
export const EXTENSION_ARCHIVO_OFICIAL = 'xlsx';
