import { ReciboSnapshot } from './recibo-snapshot';

/** Puerto de salida: el motor concreto (Puppeteer) es un detalle de infraestructura. */
export interface GeneradorPdf {
  generar(snapshot: ReciboSnapshot): Promise<Buffer>;
}

export const GENERADOR_PDF = Symbol('GeneradorPdf');
