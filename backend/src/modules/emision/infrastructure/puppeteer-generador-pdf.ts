import { Injectable, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { A4_ALTO_MM, A4_ANCHO_MM, MARGEN_LATERAL_MM, MARGEN_VERTICAL_MM } from '../domain/dimensiones-pagina';
import { GeneradorPdf } from '../domain/generador-pdf';
import { generarHtmlRecibo } from '../domain/plantilla-recibo';
import { ReciboSnapshot } from '../domain/recibo-snapshot';

const MM_A_PX = 96 / 25.4;
const ANCHO_UTIL_PX = Math.round((A4_ANCHO_MM - 2 * MARGEN_LATERAL_MM) * MM_A_PX);
const ALTO_UTIL_PX = (A4_ALTO_MM - 2 * MARGEN_VERTICAL_MM) * MM_A_PX;

// Piso de legibilidad: por debajo de esto preferimos varias páginas antes
// que un documento ilegible. Ningún recibo real de Anexo III debería
// acercarse a este límite (ver spike de validación, hasta 60 filas de
// prueba entra con escala ~78%).
const ESCALA_MINIMA = 0.7;

/**
 * Reutiliza una única instancia de Chromium entre llamadas (arrancarlo tarda
 * ~1-2s): la emisión es un proceso en lote, no de alto tráfico, así que un
 * solo navegador compartido alcanza sin necesidad de un pool.
 */
@Injectable()
export class PuppeteerGeneradorPdf implements GeneradorPdf, OnModuleDestroy {
  private navegador: Browser | null = null;

  async generar(snapshot: ReciboSnapshot): Promise<Buffer> {
    const navegador = await this.obtenerNavegador();
    const pagina = await navegador.newPage();
    try {
      // El ancho del viewport tiene que coincidir con el ancho útil de
      // impresión (A4 menos márgenes): así el alto medido en pantalla
      // corresponde exactamente al que tendría el contenido ya impreso.
      await pagina.setViewport({ width: ANCHO_UTIL_PX, height: 200 });
      // El HTML es autocontenido (estilos y SVG inline, sin recursos externos),
      // así que no hace falta esperar red inactiva: alcanza con el DOM listo.
      await pagina.setContent(generarHtmlRecibo(snapshot), { waitUntil: 'domcontentloaded' });
      await pagina.emulateMediaType('print');

      const escala = await this.calcularEscalaParaUnaPagina(pagina);

      const pdf = await pagina.pdf({ format: 'a4', printBackground: true, scale: escala });
      return Buffer.from(pdf);
    } finally {
      await pagina.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.navegador?.close();
    this.navegador = null;
  }

  private async obtenerNavegador(): Promise<Browser> {
    if (!this.navegador) {
      this.navegador = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    }
    return this.navegador;
  }

  /**
   * Garantiza que el recibo entre en una única hoja A4 (requisito
   * obligatorio, sin excepciones): mide la altura real del contenido
   * renderizado y, si excede el alto útil de la página, calcula un factor de
   * escala único que reduce todo proporcionalmente (fuente, alto de filas,
   * separaciones, gráfico) — en vez de reglas CSS independientes para cada
   * ajuste. Ver spike de validación y ADR de rediseño de plantilla.
   */
  private async calcularEscalaParaUnaPagina(pagina: import('puppeteer').Page): Promise<number> {
    // String en vez de función: el código corre en el contexto del navegador,
    // no en Node, así que tipar `document` acá exigiría sumar la lib DOM a
    // todo el proyecto backend solo por esta línea — evitado a propósito.
    const alturaMedida = (await pagina.evaluate('document.documentElement.scrollHeight')) as number;
    if (alturaMedida <= ALTO_UTIL_PX) {
      return 1;
    }
    return Math.max(ESCALA_MINIMA, ALTO_UTIL_PX / alturaMedida);
  }
}
