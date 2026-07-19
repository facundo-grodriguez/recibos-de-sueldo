export interface GuardarReciboParams {
  empresaId: string;
  importacionId: string;
  empleadoId: string;
  /**
   * Número correlativo del recibo (único por empresa). Hace única la ruta del
   * PDF: un empleado puede tener más de un recibo en la misma importación (uno
   * anulado + su reemplazo, Fase 5), y sin este discriminador el reemplazo
   * pisaría el PDF del anulado en disco, rompiendo su inmutabilidad.
   */
  numero: number;
  contenido: Buffer;
}

/** Puerto de salida: dónde y cómo se persiste el PDF es un detalle de infraestructura. */
export interface AlmacenamientoRecibos {
  /** Guarda el PDF y devuelve la ruta con la que se lo va a poder volver a leer. */
  guardar(params: GuardarReciboParams): Promise<string>;
  leer(pdfPath: string): Promise<Buffer>;
}

export const ALMACENAMIENTO_RECIBOS = Symbol('AlmacenamientoRecibos');
