import { describe, expect, it } from 'vitest';
import { formatearMonto } from '../../src/modules/emision/domain/formatear-monto';
import { generarHtmlRecibo } from '../../src/modules/emision/domain/plantilla-recibo';
import { ReciboSnapshot, ReciboSnapshotConcepto } from '../../src/modules/emision/domain/recibo-snapshot';

function concepto(overrides: Partial<ReciboSnapshotConcepto> & Pick<ReciboSnapshotConcepto, 'concepto' | 'tipo' | 'monto'>): ReciboSnapshotConcepto {
  return {
    categoriaContribucion: null,
    unidad: null,
    base: null,
    ...overrides,
  };
}

function snapshotBase(overrides: Partial<ReciboSnapshot> = {}): ReciboSnapshot {
  return {
    empresa: {
      razonSocial: 'Acme SA',
      cuit: '20-12345678-6',
      domicilio: 'Av. Siempre Viva 123',
      localidad: 'CABA',
      provincia: 'Buenos Aires',
      codigoPostal: '1000',
    },
    empleado: {
      nombre: 'Juan',
      apellido: 'Pérez',
      cuil: '27-30987654-2',
      categoria: 'Administrativo A',
      fechaIngreso: '2024-01-10',
      antiguedad: '2 años y 6 meses',
      legajo: '21',
      banco: 'Banco Nación',
    },
    periodo: {
      anio: 2026,
      mes: 7,
      fechaPago: '2026-07-05',
      lugarPago: 'CABA',
      fechaPagoCargasSociales: '2026-07-10',
      lugarPagoCargasSociales: 'CABA',
    },
    conceptos: [
      concepto({ concepto: 'Sueldo básico', tipo: 'remunerativo', monto: 1000 }),
      concepto({ concepto: 'Jubilación', tipo: 'deduccion', categoriaContribucion: 'seguridad_social', monto: 110 }),
      concepto({ concepto: 'Aporte sindical', tipo: 'contribucion_patronal', categoriaContribucion: 'sindical', monto: 50 }),
    ],
    totales: {
      totalBruto: 1000,
      totalDeducciones: 110,
      totalContribucionesPatronales: 50,
      neto: 890,
      costoLaboralTotal: 1050,
    },
    segmentosCostoLaboral: [
      { etiqueta: 'Sueldo Bruto', monto: 1000, porcentaje: (1000 / 1050) * 100, color: '#2a78d6' },
      { etiqueta: 'Sindical', monto: 50, porcentaje: (50 / 1050) * 100, color: '#008300' },
    ],
    detalleComposicionSalarial: [
      { categoria: 'sindical', etiqueta: 'Sindical', empleador: 50, trabajador: 0, total: 50 },
      { categoria: 'seguridad_social', etiqueta: 'Seguridad Social', empleador: 0, trabajador: 110, total: 110 },
    ],
    ...overrides,
  };
}

describe('generarHtmlRecibo', () => {
  it('incluye las 4 secciones del Anexo III y el gráfico de torta', () => {
    const html = generarHtmlRecibo(snapshotBase());

    expect(html).toContain('Identificación');
    expect(html).toContain('Contribuciones del empleador');
    expect(html).toContain('Remuneración bruta y deducciones');
    expect(html).toContain('Remuneración neta');
    expect(html).toContain('<svg');
  });

  it('muestra "Mes/Año" (mes de la fecha de pago, texto completo) y "Período" (mes trabajado, abreviado tipo Excel) como dos campos distintos', () => {
    const html = generarHtmlRecibo(snapshotBase());

    // snapshotBase: fechaPago '2026-07-05' → Mes/Año "Julio 2026"; anio/mes 2026/7 (mes trabajado) → Período "jul-26".
    expect(html).toContain('Mes/Año');
    expect(html).toContain('Julio 2026');
    expect(html).toContain('Período');
    expect(html).toContain('jul-26');
  });

  it('nunca antepone una numeración automática a los encabezados de sección', () => {
    const html = generarHtmlRecibo(snapshotBase());
    const encabezados = [...html.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1]);

    expect(encabezados.length).toBeGreaterThan(0);
    for (const encabezado of encabezados) {
      expect(encabezado).not.toMatch(/^\d+[.)]\s/);
    }
  });

  it('escapa HTML en campos que vienen de datos cargados por el usuario', () => {
    const snapshot = snapshotBase({
      empresa: {
        ...snapshotBase().empresa,
        razonSocial: '<script>alert(1)</script>',
      },
    });

    const html = generarHtmlRecibo(snapshot);

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('muestra el neto formateado como moneda ARS', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toMatch(/\$\s*890,00/);
  });

  it('lista cada segmento del costo laboral en la leyenda del gráfico', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toContain('Sueldo Bruto');
    expect(html).toContain('Sindical');
  });

  it('agrupa las contribuciones patronales por categoría con subtotal, con etiqueta legible, cuando hay 2 o más conceptos en esa categoría', () => {
    const snapshot = snapshotBase({
      conceptos: [
        ...snapshotBase().conceptos,
        concepto({ concepto: 'Aporte sindical adicional', tipo: 'contribucion_patronal', categoriaContribucion: 'sindical', monto: 15 }),
      ],
    });

    const html = generarHtmlRecibo(snapshot);
    expect(html).toContain('Subtotal Sindical');
  });

  it('no muestra el subtotal de una categoría cuando agrupa un único concepto (revisión funcional 2026-07-19: no aporta información)', () => {
    const html = generarHtmlRecibo(snapshotBase());
    // El fixture base trae un solo concepto de contribución patronal ("Aporte sindical", categoría sindical).
    expect(html).not.toContain('Subtotal Sindical');
    expect(html).toContain('Aporte sindical');
  });

  it('ordena los subtotales de contribuciones según el orden fijo del Anexo III, no el orden del archivo de origen', () => {
    const snapshot = snapshotBase({
      // "art" aparece primero en los conceptos, pero el orden fijo del Anexo
      // III pone "seguridad_social" y "obra_social" antes que "art". Cada
      // categoría trae 2 conceptos para que se genere su fila de subtotal.
      conceptos: [
        concepto({ concepto: 'ART', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 30 }),
        concepto({ concepto: 'ART adicional', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 5 }),
        concepto({ concepto: 'Jubilación patronal', tipo: 'contribucion_patronal', categoriaContribucion: 'seguridad_social', monto: 20 }),
        concepto({ concepto: 'Jubilación patronal adicional', tipo: 'contribucion_patronal', categoriaContribucion: 'seguridad_social', monto: 5 }),
        concepto({ concepto: 'Aporte sindical', tipo: 'contribucion_patronal', categoriaContribucion: 'sindical', monto: 50 }),
        concepto({ concepto: 'Aporte sindical adicional', tipo: 'contribucion_patronal', categoriaContribucion: 'sindical', monto: 5 }),
      ],
    });

    const html = generarHtmlRecibo(snapshot);

    const posicionSindical = html.indexOf('Subtotal Sindical');
    const posicionSeguridadSocial = html.indexOf('Subtotal Seguridad Social');
    const posicionArt = html.indexOf('Subtotal ART');

    expect(posicionSindical).toBeGreaterThan(-1);
    expect(posicionSeguridadSocial).toBeGreaterThan(-1);
    expect(posicionArt).toBeGreaterThan(-1);
    expect(posicionSindical).toBeLessThan(posicionSeguridadSocial);
    expect(posicionSeguridadSocial).toBeLessThan(posicionArt);
  });

  it('no duplica las filas de contribuciones (cada concepto aparece una sola vez, no una vez suelto y otra vez agrupado)', () => {
    const html = generarHtmlRecibo(snapshotBase());
    const ocurrencias = html.split('Aporte sindical').length - 1;
    expect(ocurrencias).toBe(1);
  });

  it('separa Remunerativo y No remunerativo en dos tablas distintas cuando hay conceptos de ambos tipos (revisión de fidelidad 2026-07-19: el Excel oficial las trae como tablas separadas)', () => {
    const snapshot = snapshotBase({
      conceptos: [
        ...snapshotBase().conceptos,
        concepto({ concepto: 'Incremento No Remunerativo', tipo: 'no_remunerativo', monto: 200 }),
      ],
    });

    const html = generarHtmlRecibo(snapshot);

    expect(html).toContain('Total remunerativo');
    expect(html).toContain('Total no remunerativo');
    const posicionRemunerativo = html.indexOf('Total remunerativo');
    const posicionNoRemunerativo = html.indexOf('Total no remunerativo');
    const posicionDeducciones = html.indexOf('Total deducciones');
    expect(posicionRemunerativo).toBeLessThan(posicionNoRemunerativo);
    expect(posicionNoRemunerativo).toBeLessThan(posicionDeducciones);
  });

  it('no muestra la tabla ni el total de No remunerativo cuando no hay ningún concepto de ese tipo', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).not.toContain('Total no remunerativo');
  });

  it('no muestra una tabla fantasma con un total en $0 cuando una sección entera no tiene conceptos (ej. sin contribuciones patronales, revisión de fidelidad 2026-07-19)', () => {
    const snapshot = snapshotBase({
      conceptos: snapshotBase().conceptos.filter((c) => c.tipo !== 'contribucion_patronal'),
      totales: {
        totalBruto: 1000,
        totalDeducciones: 110,
        totalContribucionesPatronales: 0,
        neto: 890,
        costoLaboralTotal: 1000,
      },
    });

    const html = generarHtmlRecibo(snapshot);

    expect(html).not.toContain('Total contribuciones patronales');
  });

  it('omite por completo el campo (sin reservar espacio) cuando falta la categoría, la fecha de ingreso, el legajo o el banco', () => {
    const snapshot = snapshotBase({
      empleado: { ...snapshotBase().empleado, categoria: null, fechaIngreso: null, legajo: null, banco: null },
    });

    const html = generarHtmlRecibo(snapshot);

    expect(html).not.toContain('Categoría');
    expect(html).not.toContain('Fecha de ingreso');
    expect(html).not.toContain('Legajo');
    expect(html).not.toContain('Banco');
    // El resto de la ficha sigue presente.
    expect(html).toContain('Antigüedad');
  });

  it('muestra el banco cuando está presente', () => {
    const html = generarHtmlRecibo(snapshotBase());

    expect(html).toContain('Banco');
    expect(html).toContain('Banco Nación');
  });

  it('no muestra columnas de Unidad/Base si ningún concepto las trae', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).not.toContain('>Unidad<');
    expect(html).not.toContain('>Base<');
  });

  it('muestra columnas de Unidad/Base (con guion en los conceptos que no las traen) si al menos un concepto las trae', () => {
    const snapshot = snapshotBase({
      conceptos: [
        concepto({ concepto: 'Sueldo básico', tipo: 'remunerativo', monto: 1000, unidad: '30', base: 1000 }),
        concepto({ concepto: 'Presentismo', tipo: 'remunerativo', monto: 83.33 }),
      ],
    });

    const html = generarHtmlRecibo(snapshot);

    expect(html).toContain('>Unidad<');
    expect(html).toContain('>Base<');
    expect(html).toContain('30'); // unidad del sueldo básico
  });

  it('centra el contenido de toda columna numérica (Unidad, Base y Monto) en vez de dejarlo a izquierda o derecha', () => {
    const snapshot = snapshotBase({
      conceptos: [
        concepto({ concepto: 'Sueldo básico', tipo: 'remunerativo', monto: 1000, unidad: '30', base: 1000 }),
      ],
    });

    const html = generarHtmlRecibo(snapshot);

    // Las celdas de Unidad/Base/Monto llevan la clase que las centra...
    expect(html).toContain('class="col-numerica dato-calculo"');
    expect(html).toContain('class="col-numerica monto"');
    // ...y esa clase efectivamente centra (nunca alineación a izquierda/derecha).
    expect(html).toMatch(/\.col-numerica\s*\{[^}]*text-align:\s*center/);
  });

  it('dibuja la grilla completa (líneas verticales y horizontales) en las tablas de detalle', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toMatch(/\.tabla-conceptos\s+th,\s*\.tabla-conceptos\s+td\s*\{[^}]*border:\s*1px solid/);
  });

  it('organiza la ficha de identificación como una grilla real (no flexbox con wrap independiente por fila)', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toMatch(/\.ficha\s*\{[^}]*display:\s*grid/);
  });

  it('define el mismo ancho de columna (colgroup) en las tres tablas de detalle, para que coincidan entre tablas apiladas', () => {
    const html = generarHtmlRecibo(snapshotBase());
    const colgroups = [...html.matchAll(/<colgroup>.*?<\/colgroup>/g)].map((m) => m[0]);

    expect(colgroups).toHaveLength(3);
    expect(new Set(colgroups).size).toBe(1);
    expect(html).toMatch(/\.tabla-conceptos\s*\{[^}]*table-layout:\s*fixed/);
  });

  it('permite que un nombre de concepto muy largo haga wrap dentro de su columna en vez de desbordar', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toMatch(
      /\.tabla-conceptos td:first-child,\s*\.tabla-conceptos th:first-child\s*\{[^}]*word-break:\s*break-word/,
    );
  });

  it('destaca subtotales y totales con una barra de fondo bien visible, no un tono apenas perceptible', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toMatch(/\.total-row td\s*\{[^}]*background:\s*#3a3f36[^}]*color:\s*#fdfdfb/);
    expect(html).toMatch(/\.subtotal td\s*\{[^}]*background:\s*#dedcd0/);
  });

  it('le da a "Costo laboral total" una jerarquía visual mayor que un destacado común, como primer bloque económico del recibo', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toContain('class="destacado costo-laboral"');
    expect(html).toMatch(/\.destacado\.costo-laboral\s*\{[^}]*background:/);
  });

  it('no imprime "Detalle de composición salarial" como sección propia (decisión de producto 2026-07-23: no es una de las 6 secciones obligatorias, duplicaba datos ya completos en Contribuciones/Deducciones)', () => {
    const html = generarHtmlRecibo(snapshotBase());

    expect(html).not.toContain(`Empleador: ${formatearMonto(50)}`);
    expect(html).not.toContain(`Trabajador: ${formatearMonto(110)}`);
  });

  it('ubica la Firma inmediatamente después del Sueldo Neto, antes del Detalle de composición salarial y el gráfico (orden del Anexo III oficial)', () => {
    const html = generarHtmlRecibo(snapshotBase());

    const posicionNeto = html.indexOf('Remuneración neta');
    const posicionFirma = html.indexOf('Firma del empleado');
    const posicionDetalle = html.indexOf('class="pie-documento"');

    expect(posicionNeto).toBeGreaterThan(-1);
    expect(posicionFirma).toBeGreaterThan(-1);
    expect(posicionDetalle).toBeGreaterThan(-1);
    expect(posicionNeto).toBeLessThan(posicionFirma);
    expect(posicionFirma).toBeLessThan(posicionDetalle);
  });

  describe('guarda de cobertura (un tipo sin contemplar no puede desaparecer del recibo en silencio)', () => {
    it('rechaza emitir si algún concepto tiene un tipo que ninguna de las 4 tablas reconoce', () => {
      const snapshot = snapshotBase({
        conceptos: [
          ...snapshotBase().conceptos,
          concepto({ concepto: 'Retención judicial', tipo: 'retencion_judicial', monto: 200 }),
        ],
      });

      expect(() => generarHtmlRecibo(snapshot)).toThrow(/tipo sin contemplar/);
      expect(() => generarHtmlRecibo(snapshot)).toThrow(/retencion_judicial/);
    });
  });
});
