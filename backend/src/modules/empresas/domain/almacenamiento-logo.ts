import { Empresa } from './empresa.entity';

export interface GuardarLogoParams {
  empresaId: string;
  /** Sin el punto, ej. "png" — se usa tal cual para nombrar el archivo. */
  extension: string;
  contenido: Buffer;
}

/** Puerto de salida: dónde y cómo se persiste el logo es un detalle de infraestructura. */
export interface AlmacenamientoLogo {
  /** Guarda la imagen y devuelve la ruta (con extensión) con la que se la va a poder volver a leer. */
  guardar(params: GuardarLogoParams): Promise<string>;
  leer(logoPath: string): Promise<Buffer>;
}

export const ALMACENAMIENTO_LOGO = Symbol('AlmacenamientoLogo');

/** Únicos formatos aceptados al subir un logo (validados también en el controller, antes de llegar acá). */
const MIME_POR_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/** Mime type a partir de la extensión guardada en `logoPath` — usado tanto para servir el archivo (GET) como para armar el data URI que se congela en el snapshot del recibo al emitir. */
export function mimeTypeDeExtension(extension: string): string {
  return MIME_POR_EXTENSION[extension.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Logo vigente de la empresa, ya codificado como data URI — o `null` si no
 * cargó ninguno. Usado por `EmitirRecibosUseCase`/`ReemitirReciboUseCase`
 * para congelarlo dentro del snapshot al momento de emitir (nunca se lee en
 * vivo desde un recibo ya generado).
 */
export async function leerLogoComoDataUri(
  empresa: Empresa,
  almacenamiento: AlmacenamientoLogo,
): Promise<string | null> {
  if (!empresa.logoPath) return null;
  const contenido = await almacenamiento.leer(empresa.logoPath);
  const extension = empresa.logoPath.split('.').pop() ?? '';
  return `data:${mimeTypeDeExtension(extension)};base64,${contenido.toString('base64')}`;
}
