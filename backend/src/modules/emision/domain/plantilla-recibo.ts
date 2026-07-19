import { MARGEN_LATERAL_MM, MARGEN_VERTICAL_MM } from './dimensiones-pagina';
import { formatearMonto } from './formatear-monto';
import { generarGraficoTortaSvg } from './generar-grafico-torta-svg';
import { CATEGORIAS_CONTRIBUCION_ORDEN } from './etiquetas-costo-laboral';
import { NOMBRES_MES } from './nombre-mes';
import { ReciboSnapshot, ReciboSnapshotConcepto, ReciboSnapshotDetalleCategoria } from './recibo-snapshot';

// Los datos vienen de archivos y formularios cargados por el usuario — nunca
// se interpolan crudos en el HTML que Puppeteer va a renderizar.
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Bloque "etiqueta arriba, valor abajo" — se omite entero si no hay valor. */
function campo(etiqueta: string, valor: string | null): string {
  if (!valor) return '';
  return `<div class="campo"><span class="etiqueta">${escaparHtml(etiqueta)}</span><span class="valor">${escaparHtml(valor)}</span></div>`;
}

function destacado(etiqueta: string, monto: number, claseExtra = ''): string {
  return `<div class="destacado ${claseExtra}"><span class="etiqueta-destacado">${escaparHtml(etiqueta)}</span><span class="monto-destacado">${formatearMonto(monto)}</span></div>`;
}

/**
 * Tabla de conceptos con columnas UNIDAD/BASE (auditoría de cálculo, ver
 * plantilla oficial de referencia) — esas dos columnas solo se muestran si
 * al menos un concepto del recibo entero las trae; si ninguno las trae, se
 * omiten por completo en vez de dejar dos columnas vacías sin información.
 */
// "col-numerica": toda columna numérica (Unidad, Base, Monto) queda
// centrada respecto de su propia columna — nunca desplazada a izquierda ni
// derecha (requisito obligatorio, ver DECISIONS.md). ".monto" se mantiene
// aparte para el formato tabular-nums que sí necesita también fuera de tablas.
function filaConcepto(concepto: ReciboSnapshotConcepto, mostrarCalculo: boolean): string {
  if (!mostrarCalculo) {
    return `<tr><td>${escaparHtml(concepto.concepto)}</td><td class="col-numerica monto">${formatearMonto(concepto.monto)}</td></tr>`;
  }
  return `<tr>
    <td>${escaparHtml(concepto.concepto)}</td>
    <td class="col-numerica dato-calculo">${concepto.unidad ? escaparHtml(concepto.unidad) : '—'}</td>
    <td class="col-numerica dato-calculo">${concepto.base !== null ? formatearMonto(concepto.base) : '—'}</td>
    <td class="col-numerica monto">${formatearMonto(concepto.monto)}</td>
  </tr>`;
}

function encabezadoTabla(mostrarCalculo: boolean): string {
  if (!mostrarCalculo) {
    return '<thead><tr><th>Concepto</th><th class="col-numerica">Monto</th></tr></thead>';
  }
  return '<thead><tr><th>Concepto</th><th class="col-numerica">Unidad</th><th class="col-numerica">Base</th><th class="col-numerica">Monto</th></tr></thead>';
}

/**
 * Mismos anchos de columna, siempre, en las tres tablas del recibo
 * (contribuciones/remunerativo/deducciones): sin esto, cada `<table>`
 * autocalcularía su ancho de columna de forma independiente y los bordes no
 * coincidirían entre tablas apiladas, aunque cada una esté prolija puertas
 * adentro. Va siempre (incluso si esta tabla puntual no tiene filas todavía)
 * para que `table-layout: fixed` tenga de dónde tomar el ancho.
 */
function colgroupTabla(mostrarCalculo: boolean): string {
  if (!mostrarCalculo) {
    return '<colgroup><col style="width:78%"><col style="width:22%"></colgroup>';
  }
  return '<colgroup><col style="width:44%"><col style="width:16%"><col style="width:20%"><col style="width:20%"></colgroup>';
}

/**
 * Envuelve filas de `<tr>` ya armadas (planas para remunerativo/deducciones,
 * o agrupadas con subtotal por categoría para contribuciones) en su tabla.
 * Recibe el HTML de las filas ya construido — nunca vuelve a recorrer los
 * conceptos — para no arriesgar que una sección se renderice dos veces.
 */
function envolverTabla(filasHtml: string, filaTotal: string, mostrarCalculo: boolean): string {
  return `<table class="tabla-conceptos">
    ${colgroupTabla(mostrarCalculo)}
    ${filasHtml ? encabezadoTabla(mostrarCalculo) : ''}
    <tbody>${filasHtml}${filaTotal}</tbody>
  </table>`;
}

function filaDetalleCategoria(detalle: ReciboSnapshotDetalleCategoria): string {
  const subFilas = [
    detalle.empleador > 0 ? `<span>Empleador: ${formatearMonto(detalle.empleador)}</span>` : '',
    detalle.trabajador > 0 ? `<span>Trabajador: ${formatearMonto(detalle.trabajador)}</span>` : '',
  ].filter(Boolean).join('');

  return `<div class="detalle-item">
    <div class="detalle-item-total"><span>${escaparHtml(detalle.etiqueta)}</span><span class="monto">${formatearMonto(detalle.total)}</span></div>
    <div class="detalle-item-sub">${subFilas}</div>
  </div>`;
}

/**
 * Genera el HTML completo del recibo (Anexo III: 4 secciones + gráfico de
 * torta) a partir de un snapshot ya resuelto. Puppeteer solo convierte este
 * HTML a PDF — toda la estructura del documento vive acá, en el dominio.
 *
 * Layout fluido a propósito (flex/grid, sin posiciones ni tamaños fijos):
 * el motor de ajuste a una página (PuppeteerGeneradorPdf) mide la altura
 * real renderizada y aplica una escala uniforme si no entra en una A4 — ver
 * ADR de rediseño de plantilla. Ninguna sección sin datos reserva espacio.
 */
export function generarHtmlRecibo(snapshot: ReciboSnapshot): string {
  const { empresa, empleado, periodo, conceptos, totales, segmentosCostoLaboral, detalleComposicionSalarial } =
    snapshot;

  const remunerativos = conceptos.filter((c) => c.tipo === 'remunerativo' || c.tipo === 'no_remunerativo');
  const deducciones = conceptos.filter((c) => c.tipo === 'deduccion');
  const contribuciones = conceptos.filter((c) => c.tipo === 'contribucion_patronal');
  const mostrarCalculo = conceptos.some((c) => c.unidad !== null || c.base !== null);

  const contribucionesPorCategoria = new Map<string, ReciboSnapshotConcepto[]>();
  for (const concepto of contribuciones) {
    const clave = concepto.categoriaContribucion ?? 'otros';
    const lista = contribucionesPorCategoria.get(clave) ?? [];
    lista.push(concepto);
    contribucionesPorCategoria.set(clave, lista);
  }

  // Mismo orden fijo del Anexo III que usa el gráfico de torta (ver ADR-039):
  // nunca el orden de aparición en el archivo de origen, que es arbitrario.
  // El subtotal de una categoría solo se muestra si agrupa 2 o más conceptos
  // (revisión funcional 2026-07-19): con un único concepto, el subtotal es
  // idéntico al monto de esa fila y no aporta ninguna información nueva.
  const filasContribuciones = CATEGORIAS_CONTRIBUCION_ORDEN.map(({ categoria, etiqueta }) => {
    const items = contribucionesPorCategoria.get(categoria);
    if (!items || items.length === 0) return '';
    const filas = items.map((c) => filaConcepto(c, mostrarCalculo)).join('');
    if (items.length === 1) return filas;
    const subtotal = items.reduce((acc, c) => acc + c.monto, 0);
    const colspanPrevio = mostrarCalculo ? 3 : 1;
    return `${filas}<tr class="subtotal"><td colspan="${colspanPrevio}">Subtotal ${escaparHtml(etiqueta)}</td><td class="monto">${formatearMonto(subtotal)}</td></tr>`;
  }).join('');

  const colspanTotal = mostrarCalculo ? 3 : 1;
  const totalContribuciones = `<tr class="total-row"><td colspan="${colspanTotal}">Total contribuciones patronales</td><td class="monto">${formatearMonto(totales.totalContribucionesPatronales)}</td></tr>`;
  const totalBrutoFila = `<tr class="total-row"><td colspan="${colspanTotal}">Total remuneración bruta</td><td class="monto">${formatearMonto(totales.totalBruto)}</td></tr>`;
  const totalDeduccionesFila = `<tr class="total-row"><td colspan="${colspanTotal}">Total deducciones</td><td class="monto">${formatearMonto(totales.totalDeducciones)}</td></tr>`;

  const leyendaGrafico = segmentosCostoLaboral
    .map(
      (s) =>
        `<li><span class="swatch" style="background:${s.color}"></span>${escaparHtml(s.etiqueta)}: ${formatearMonto(s.monto)} (${s.porcentaje.toFixed(1)}%)</li>`,
    )
    .join('');

  const domicilioEmpresa = [empresa.domicilio, empresa.localidad, empresa.provincia].filter(Boolean).join(', ');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: ${MARGEN_VERTICAL_MM}mm ${MARGEN_LATERAL_MM}mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 10.5px; color: #0b0b0b; margin: 0; }
  h1 { font-size: 15px; margin: 0; }
  h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.03em; color: #52514e; margin: 8px 0 3px; padding-bottom: 2px; border-bottom: 1px solid #c3c2b7; }
  p { margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; color: #767568; padding: 2.5px 4px; }
  td { padding: 2px 4px; vertical-align: middle; }
  .monto { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .dato-calculo { color: #52514e; font-variant-numeric: tabular-nums; white-space: nowrap; }
  /* Requisito obligatorio: toda columna numérica (Unidad/Base/Monto) va
     centrada respecto de su propia columna, nunca a izquierda ni derecha. */
  .col-numerica { text-align: center; }
  /* Ancho de columna fijo e idéntico en las tres tablas del recibo (ver
     colgroupTabla) — sin esto cada tabla autocalcula su propio ancho y las
     columnas no coinciden entre tablas apiladas, aunque cada una esté
     alineada puertas adentro. */
  .tabla-conceptos { table-layout: fixed; }
  .tabla-conceptos td:first-child, .tabla-conceptos th:first-child { word-break: break-word; }
  /* Requisito obligatorio: grilla completa (líneas verticales y
     horizontales) en las tablas de detalle, como la plantilla oficial. */
  .tabla-conceptos th, .tabla-conceptos td { border: 1px solid #a8a69a; }
  .subtotal td { font-weight: 700; background: #dedcd0; }
  .total-row td { font-weight: 700; background: #3a3f36; color: #fdfdfb; }

  .encabezado-empresa { margin-bottom: 6px; }
  .encabezado-empresa .empresa-datos { font-size: 10px; color: #52514e; }

  /* Grilla real (no flexbox+wrap): todo campo comparte las mismas columnas,
     así la ficha se lee como un único bloque prolijo en vez de filas que
     envuelven de forma independiente y no quedan alineadas entre sí. */
  .ficha { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 4px 14px; margin: 6px 0; }
  .campo { display: flex; flex-direction: column; min-width: 90px; }
  .campo .etiqueta { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.03em; color: #767568; }
  .campo .valor { font-weight: 600; }

  .destacado { display: flex; justify-content: space-between; align-items: baseline; background: #f4f3ee; padding: 3px 8px; margin: 4px 0; }
  .destacado .etiqueta-destacado { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.03em; color: #52514e; }
  .destacado .monto-destacado { font-size: 13px; font-weight: 700; }
  .destacado.neto { background: #e4e2d7; }
  .destacado.neto .monto-destacado { font-size: 17px; }
  /* "Costo laboral total" es el primer bloque económico del recibo (mismo
     orden que el modelo oficial) — necesita un peso visual acorde, no el
     mismo tratamiento tenue que un destacado cualquiera. */
  .destacado.costo-laboral { background: #3a3f36; }
  .destacado.costo-laboral .etiqueta-destacado { color: #d8d6cb; }
  .destacado.costo-laboral .monto-destacado { font-size: 16px; color: #fdfdfb; }

  .pie-documento { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; margin-top: 6px; }
  .detalle-composicion { flex: 3; min-width: 220px; display: flex; flex-wrap: wrap; gap: 4px 20px; }
  .detalle-item { min-width: 150px; font-size: 9.5px; }
  .detalle-item-total { display: flex; justify-content: space-between; font-weight: 600; }
  .detalle-item-total .monto { font-variant-numeric: tabular-nums; }
  .detalle-item-sub { display: flex; gap: 10px; color: #767568; }

  /* El gráfico es un complemento informativo, no el protagonista: tamaño
     acotado y proporción menor frente al detalle de composición (arriba). */
  .grafico-container { flex: 1; max-width: 160px; display: flex; align-items: center; gap: 6px; }
  .grafico-container svg { width: 52px; height: 52px; flex-shrink: 0; }
  ul.leyenda { list-style: none; margin: 0; padding: 0; font-size: 8px; flex: 1; min-width: 0; }
  ul.leyenda li { margin-bottom: 2px; }
  .swatch { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 2px; }

  .pie-firma { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; font-size: 9.5px; color: #52514e; }
  .linea-firma { border-top: 1px solid #0b0b0b; padding-top: 2px; min-width: 160px; text-align: center; }
  .nota-legal { font-size: 8px; color: #9a9990; margin-top: 6px; }
</style>
</head>
<body>
  <div class="encabezado-empresa">
    <h1>${escaparHtml(empresa.razonSocial)}</h1>
    <p class="empresa-datos">${domicilioEmpresa ? escaparHtml(domicilioEmpresa) : ''}${domicilioEmpresa ? ' — ' : ''}CUIT ${escaparHtml(empresa.cuit)}</p>
  </div>

  <h2>Identificación</h2>
  <div class="ficha">
    ${campo('Período', `${NOMBRES_MES[periodo.mes - 1]} ${periodo.anio}`)}
    ${campo('Legajo', empleado.legajo)}
    ${campo('Apellido y nombre', `${empleado.apellido}, ${empleado.nombre}`)}
    ${campo('C.U.I.L.', empleado.cuil)}
    ${campo('Banco', empleado.banco)}
    ${campo('Categoría', empleado.categoria)}
    ${campo('Fecha de ingreso', empleado.fechaIngreso)}
    ${campo('Antigüedad', empleado.antiguedad)}
    ${campo('Lugar y fecha de pago', `${periodo.lugarPago} — ${periodo.fechaPago}`)}
    ${campo('Pago de cargas sociales', `${periodo.lugarPagoCargasSociales} — ${periodo.fechaPagoCargasSociales}`)}
  </div>

  <h2>Contribuciones del empleador</h2>
  ${destacado('Costo laboral total', totales.costoLaboralTotal, 'costo-laboral')}
  ${envolverTabla(filasContribuciones, totalContribuciones, mostrarCalculo)}

  <h2>Remuneración bruta y deducciones</h2>
  ${destacado('Sueldo bruto', totales.totalBruto)}
  ${envolverTabla(remunerativos.map((c) => filaConcepto(c, mostrarCalculo)).join(''), totalBrutoFila, mostrarCalculo)}
  ${envolverTabla(deducciones.map((c) => filaConcepto(c, mostrarCalculo)).join(''), totalDeduccionesFila, mostrarCalculo)}

  <h2>Remuneración neta</h2>
  ${destacado('Sueldo neto', totales.neto, 'neto')}

  <div class="pie-firma">
    <p>Recibí conforme la suma indicada.<br>${escaparHtml(periodo.lugarPago)}, ${escaparHtml(periodo.fechaPago)}.</p>
    <div class="linea-firma">Firma del trabajador</div>
  </div>

  <div class="pie-documento">
    <div class="detalle-composicion">
      ${detalleComposicionSalarial.map(filaDetalleCategoria).join('') || '<p>—</p>'}
    </div>
    <div class="grafico-container">
      ${generarGraficoTortaSvg(segmentosCostoLaboral)}
      <ul class="leyenda">${leyendaGrafico}</ul>
    </div>
  </div>

  <p class="nota-legal">Recibo conforme Anexo III, Decreto 407/2026. Documento de repositorio técnico — ver Términos y Condiciones.</p>
</body>
</html>`;
}
