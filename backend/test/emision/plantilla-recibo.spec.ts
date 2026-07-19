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
      { etiqueta: 'Sueldo Neto', monto: 1000, porcentaje: (1000 / 1050) * 100, color: '#2a78d6' },
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
    expect(html).toContain('Sueldo Neto');
    expect(html).toContain('Sindical');
  });

  it('agrupa las contribuciones patronales por categoría con subtotal, con etiqueta legible', () => {
    const html = generarHtmlRecibo(snapshotBase());
    expect(html).toContain('Subtotal Sindical');
  });

  it('ordena los subtotales de contribuciones según el orden fijo del Anexo III, no el orden del archivo de origen', () => {
    const snapshot = snapshotBase({
      // "art" aparece primero en los conceptos, pero el orden fijo del Anexo
      // III pone "seguridad_social" y "obra_social" antes que "art".
      conceptos: [
        concepto({ concepto: 'ART', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 30 }),
        concepto({ concepto: 'Jubilación patronal', tipo: 'contribucion_patronal', categoriaContribucion: 'seguridad_social', monto: 20 }),
        concepto({ concepto: 'Aporte sindical', tipo: 'contribucion_patronal', categoriaContribucion: 'sindical', monto: 50 }),
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

  it('muestra el detalle de composición salarial cruzando empleador y trabajador por categoría', () => {
    const html = generarHtmlRecibo(snapshotBase());

    expect(html).toContain(`Empleador: ${formatearMonto(50)}`);
    expect(html).toContain(`Trabajador: ${formatearMonto(110)}`);
  });

  it('no muestra un sub-renglón de Empleador o Trabajador cuando ese lado es cero', () => {
    const html = generarHtmlRecibo(snapshotBase());
    // "Sindical" en este fixture solo tiene lado empleador (50), no trabajador.
    const bloqueSindical = html.slice(html.indexOf('Sindical'), html.indexOf('Sindical') + 200);
    expect(bloqueSindical).not.toContain(`Trabajador: ${formatearMonto(0)}`);
  });
});
