export interface ArchivoParaEmpaquetar {
  nombre: string;
  contenido: Buffer;
}

/** Puerto de salida: el formato de empaquetado concreto (ZIP vía archiver) es un detalle de infraestructura. */
export interface EmpaquetadorZip {
  crear(archivos: ArchivoParaEmpaquetar[]): Promise<Buffer>;
}

export const EMPAQUETADOR_ZIP = Symbol('EmpaquetadorZip');
