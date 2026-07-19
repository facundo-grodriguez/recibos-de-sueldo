/**
 * Arma el header Content-Disposition con el nombre de archivo correcto para
 * clientes HTTP viejos/estrictos (ASCII, vía `filename=`) y para el resto
 * (UTF-8 completo, con tildes/ñ, vía `filename*=`, RFC 6266) — los navegadores
 * modernos prefieren `filename*` cuando ambos están presentes.
 */
export function construirContentDisposition(nombreArchivo: string): string {
  const rangoMarcasDiacriticas = new RegExp('[̀-ͯ]', 'g');
  const nombreAscii = nombreArchivo
    .normalize('NFKD')
    .replace(rangoMarcasDiacriticas, '')
    .replace(/[^\x20-\x7E]/g, '_');

  return `attachment; filename="${nombreAscii}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`;
}
