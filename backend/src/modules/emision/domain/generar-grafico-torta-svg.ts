import { ReciboSnapshotSegmento } from './recibo-snapshot';

const RADIO = 70;
const GROSOR = 34;
const CENTRO = 90;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/**
 * Gráfico de torta (donut) como SVG puro, sin librerías: cada gajo es un
 * <circle> con stroke-dasharray/stroke-dashoffset. Técnica estándar para
 * proporciones simples, evita sumar una dependencia de charting solo para esto.
 */
export function generarGraficoTortaSvg(segmentos: ReciboSnapshotSegmento[]): string {
  let acumulado = 0;

  const gajos = segmentos
    .map((segmento) => {
      const largo = (segmento.porcentaje / 100) * CIRCUNFERENCIA;
      const dashoffset = -acumulado;
      acumulado += largo;

      return (
        `<circle cx="${CENTRO}" cy="${CENTRO}" r="${RADIO}" fill="none" ` +
        `stroke="${segmento.color}" stroke-width="${GROSOR}" ` +
        `stroke-dasharray="${largo.toFixed(2)} ${(CIRCUNFERENCIA - largo).toFixed(2)}" ` +
        `stroke-dashoffset="${dashoffset.toFixed(2)}" ` +
        `transform="rotate(-90 ${CENTRO} ${CENTRO})" />`
      );
    })
    .join('');

  return (
    `<svg width="${CENTRO * 2}" height="${CENTRO * 2}" viewBox="0 0 ${CENTRO * 2} ${CENTRO * 2}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Composición del costo laboral total">${gajos}</svg>`
  );
}
