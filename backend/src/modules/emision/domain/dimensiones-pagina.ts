/**
 * Única fuente de verdad de las dimensiones de la hoja: tanto la CSS `@page`
 * de la plantilla (plantilla-recibo.ts) como el motor de ajuste a una página
 * (PuppeteerGeneradorPdf) leen de acá — si algún día cambia el margen, se
 * cambia en un solo lugar y ambos quedan sincronizados.
 *
 * Margen lateral distinto (y más angosto) que el vertical a propósito:
 * aprovecha mejor el ancho útil del A4 sin achicar tanto el respiro
 * arriba/abajo del documento.
 */
export const A4_ANCHO_MM = 210;
export const A4_ALTO_MM = 297;
export const MARGEN_VERTICAL_MM = 10;
export const MARGEN_LATERAL_MM = 8;
