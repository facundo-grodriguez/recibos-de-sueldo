import { DomainError } from '../../../shared/errors/domain-error';
import { MARGEN_LATERAL_MM, MARGEN_VERTICAL_MM } from './dimensiones-pagina';
import { formatearMonto } from './formatear-monto';
import { generarGraficoTortaSvg } from './generar-grafico-torta-svg';
import { CATEGORIAS_CONTRIBUCION_ORDEN } from './etiquetas-costo-laboral';
import { montoEnPalabras } from './monto-en-palabras';
import { NOMBRES_MES } from './nombre-mes';
import { ReciboSnapshot, ReciboSnapshotConcepto, ReciboSnapshotDetalleCategoria } from './recibo-snapshot';

/**
 * Guarda de cobertura (a propósito, ver clasificacion-concepto.ts): las 4
 * tablas del recibo se arman filtrando por `tipo` uno por uno — si el día de
 * mañana se agrega un TipoConcepto nuevo y alguien olvida sumarlo a alguna de
 * las 4 tablas, ese concepto desaparecería del documento sin ningún error.
 * Preferible frenar la emisión con un mensaje claro a emitir un recibo legal
 * incompleto.
 */
function validarCoberturaCompleta(
  conceptos: ReciboSnapshotConcepto[],
  grupos: ReciboSnapshotConcepto[][],
): void {
  const totalAgrupado = grupos.reduce((suma, grupo) => suma + grupo.length, 0);
  if (totalAgrupado !== conceptos.length) {
    const tiposContemplados = new Set(grupos.flat().map((c) => c.tipo));
    const tiposSinContemplar = [...new Set(conceptos.map((c) => c.tipo).filter((tipo) => !tiposContemplados.has(tipo)))];
    throw new DomainError(
      `${conceptos.length - totalAgrupado} concepto(s) con tipo sin contemplar en ninguna tabla del recibo: ${tiposSinContemplar.join(', ')}`,
    );
  }
}

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

/**
 * Bloque "etiqueta arriba, valor abajo" — se omite entero si no hay valor.
 * Nunca se completa con un placeholder ni un valor asumido: si el dato no
 * vino del origen, el campo directamente no aparece (ADR-071).
 */
function campo(etiqueta: string, valor: string | null): string {
  if (!valor) return '';
  return `<div class="campo"><span class="etiqueta">${escaparHtml(etiqueta)}</span><span class="valor">${escaparHtml(valor)}</span></div>`;
}

/**
 * El Excel oficial trae dos campos de fecha distintos en la ficha: "MES/AÑO"
 * (texto completo, el mes del recibo/pago) y "Período" (el mes efectivamente
 * trabajado, un mes antes, mostrado abreviado tipo Excel "mmm-aa" — ej.
 * "may-26"). No son el mismo dato: "Mes/Año" surge del mes de la fecha de
 * pago; "Período" ya es `Importacion.anio/mes` (revisión funcional 2026-07-19).
 */
function mesAnioDesdeFecha(fechaIso: string): string {
  const [anio, mes] = fechaIso.split('-').map(Number);
  return `${NOMBRES_MES[mes - 1]} ${anio}`;
}

function periodoAbreviado(anio: number, mes: number): string {
  return `${NOMBRES_MES[mes - 1].slice(0, 3).toLowerCase()}-${String(anio).slice(-2)}`;
}

function destacado(etiqueta: string, monto: number, claseExtra = ''): string {
  return `<div class="destacado ${claseExtra}"><span class="etiqueta-destacado">${escaparHtml(etiqueta)}</span><span class="monto-destacado">${formatearMonto(monto)}</span></div>`;
}

/**
 * Tabla de conceptos con columnas UNIDAD/BASE (auditoría de cálculo, ver
 * plantilla oficial de referencia) — esas dos columnas solo se muestran si
 * al menos un concepto del recibo entero las trae; si ninguno las trae, se
 * omiten por completo en vez de dejar dos columnas vacías sin información.
 * Por concepto individual rige lo mismo: si el origen no informó unidad o
 * base para esa fila puntual, se imprime "—" (ver `filaConcepto`) — nunca
 * se infiere a partir de otro dato del mismo recibo (ADR-071).
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
// Sin filas no hay tabla: antes se seguía mostrando el renglón de total
// (ej. "Total contribuciones patronales $ 0,00") sin encabezado ni datos —
// una tabla fantasma con un total sin sentido, cuando el origen de datos
// simplemente no trajo conceptos de ese tipo para este empleado (hallazgo
// real de la revisión de fidelidad 2026-07-19, con un empleado real sin
// contribuciones patronales en el archivo de origen).
function envolverTabla(filasHtml: string, filaTotal: string, mostrarCalculo: boolean): string {
  if (!filasHtml) return '';
  return `<table class="tabla-conceptos">
    ${colgroupTabla(mostrarCalculo)}
    ${encabezadoTabla(mostrarCalculo)}
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
 * Genera el HTML completo del recibo a partir de un snapshot ya resuelto:
 * las 6 secciones obligatorias del Anexo III (encabezado del empleador,
 * ficha de identificación, contribuciones del empleador, remuneración
 * bruta y deducciones, remuneración neta, firma) + dos complementos
 * (decisión de producto, ADR-080) que no son obligatorios en sí pero se
 * mantienen porque agregan valor real: "Detalle de composición salarial"
 * (cruce Empleador/Trabajador por categoría) y el gráfico de torta del
 * gasto del empleador. Puppeteer solo convierte este HTML a PDF — toda la
 * estructura del documento vive acá, en el dominio.
 *
 * Layout fluido a propósito (flex/grid, sin posiciones ni tamaños fijos):
 * el motor de ajuste a una página (PuppeteerGeneradorPdf) mide la altura
 * real renderizada y aplica una escala uniforme si no entra en una A4 — ver
 * ADR de rediseño de plantilla. Ninguna sección sin datos reserva espacio.
 */
export function generarHtmlRecibo(snapshot: ReciboSnapshot): string {
  const { empresa, empleado, periodo, conceptos, totales, segmentosCostoLaboral, detalleComposicionSalarial } =
    snapshot;

  // El Excel oficial trae Remunerativo y No remunerativo como dos tablas
  // separadas dentro de "Remuneración bruta y deducciones" (sección 4 de
  // docs/modelo-funcional-anexo-iii.md) — nunca mezcladas en una sola,
  // aunque ambas sumen al mismo "Sueldo bruto". Hallazgo real de la
  // revisión de fidelidad 2026-07-19: un concepto no remunerativo real
  // (ej. "Incremento No Remunerativo") quedaba indistinguible de uno
  // remunerativo en la tabla combinada.
  const remunerativosPuros = conceptos.filter((c) => c.tipo === 'remunerativo');
  const noRemunerativos = conceptos.filter((c) => c.tipo === 'no_remunerativo');
  const deducciones = conceptos.filter((c) => c.tipo === 'deduccion');
  const contribuciones = conceptos.filter((c) => c.tipo === 'contribucion_patronal');
  validarCoberturaCompleta(conceptos, [remunerativosPuros, noRemunerativos, deducciones, contribuciones]);
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
    return `${filas}<tr class="subtotal"><td colspan="${colspanPrevio}">Subtotal ${escaparHtml(etiqueta)}</td><td class="col-numerica monto">${formatearMonto(subtotal)}</td></tr>`;
  }).join('');

  const colspanTotal = mostrarCalculo ? 3 : 1;
  const totalContribuciones = `<tr class="total-row"><td colspan="${colspanTotal}">Total contribuciones patronales</td><td class="col-numerica monto">${formatearMonto(totales.totalContribucionesPatronales)}</td></tr>`;
  const totalRemunerativoFila = `<tr class="total-row"><td colspan="${colspanTotal}">Total remunerativo</td><td class="col-numerica monto">${formatearMonto(remunerativosPuros.reduce((acc, c) => acc + c.monto, 0))}</td></tr>`;
  const totalNoRemunerativoFila = `<tr class="total-row"><td colspan="${colspanTotal}">Total no remunerativo</td><td class="col-numerica monto">${formatearMonto(noRemunerativos.reduce((acc, c) => acc + c.monto, 0))}</td></tr>`;
  const totalDeduccionesFila = `<tr class="total-row"><td colspan="${colspanTotal}">Total deducciones</td><td class="col-numerica monto">${formatearMonto(totales.totalDeducciones)}</td></tr>`;

  const leyendaGrafico = segmentosCostoLaboral
    .map(
      (s) =>
        `<li><span class="swatch" style="background:${s.color}"></span>${escaparHtml(s.etiqueta)}: <span class="valor">${formatearMonto(s.monto)} (${s.porcentaje.toFixed(1)}%)</span></li>`,
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

  .encabezado-empresa { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .encabezado-empresa .empresa-datos { font-size: 10px; color: #52514e; }
  /* Altura tope fija (nunca ancho): logos apaisados o cuadrados quedan
     igual de contenidos sin deformarse ni empujar el resto del encabezado. */
  .logo-empresa { max-height: 40px; max-width: 120px; object-fit: contain; flex-shrink: 0; }

  /* Grilla real (no flexbox+wrap): todo campo comparte las mismas columnas,
     así la ficha se lee como un único bloque prolijo en vez de filas que
     envuelven de forma independiente y no quedan alineadas entre sí. */
  .ficha { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 4px 14px; margin: 6px 0; }
  .campo { display: flex; flex-direction: column; min-width: 90px; }
  .campo .etiqueta { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.03em; color: #767568; }
  .campo .valor { font-weight: 600; }
  /* Campo fuera de la grilla de identificación (ej. "Pago de cargas
     sociales", que es un dato de la relación empleador-Estado, no de la
     ficha del empleado) — mismo estilo de etiqueta/valor, con su propio
     margen en vez de heredar el gap de la grilla .ficha. */
  .campo-suelto { margin: 2px 0 6px; }

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
  /* Grid de 2 columnas fijas (no flex-wrap orgánico): la cantidad de
     categorías con importe varía de un recibo a otro, pero la estructura
     visual de "dos columnas" se mantiene siempre igual, sin línea divisoria,
     aunque quede una celda vacía al final con un número impar de categorías. */
  .detalle-composicion { flex: 3; min-width: 220px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; align-content: start; }
  .detalle-item { font-size: 9.5px; }
  .detalle-item-total { display: flex; justify-content: space-between; font-weight: 600; }
  .detalle-item-total .monto { font-variant-numeric: tabular-nums; }
  .detalle-item-sub { display: flex; gap: 10px; color: #767568; }

  /* El gráfico sigue siendo un complemento, no el protagonista, pero con más
     presencia para equilibrar mejor contra el detalle de composición (que
     ocupa siempre sus 2 columnas completas). */
  .grafico-container { flex: 1; max-width: 230px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .grafico-container svg { width: 92px; height: 92px; flex-shrink: 0; }
  ul.leyenda { list-style: none; margin: 0; padding: 0; font-size: 8px; width: 100%; }
  ul.leyenda li { margin-bottom: 2px; }
  /* El monto y el porcentaje nunca se separan entre sí al hacer wrap — si
     no entran junto a la etiqueta, bajan los dos juntos a la línea
     siguiente en vez de partir "(0.4%)" solo, huérfano. */
  ul.leyenda .valor { white-space: nowrap; }
  .swatch { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 2px; }

  /* Más aire respecto del Sueldo Neto, y más espacio/peso propio para la
     firma del empleado (antes un renglón chico al costado del texto). */
  .pie-firma { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; font-size: 9.5px; color: #52514e; }
  .linea-firma { border-top: 1px solid #0b0b0b; padding-top: 4px; min-width: 260px; text-align: center; font-size: 10.5px; font-weight: 600; color: #0b0b0b; }
</style>
</head>
<body>
  <div class="encabezado-empresa">
    ${empresa.logoDataUri ? `<img class="logo-empresa" src="${empresa.logoDataUri}" alt="">` : ''}
    <div>
      <h1>${escaparHtml(empresa.razonSocial)}</h1>
      <p class="empresa-datos">${domicilioEmpresa ? escaparHtml(domicilioEmpresa) : ''}${domicilioEmpresa ? ' — ' : ''}CUIT ${escaparHtml(empresa.cuit)}</p>
    </div>
  </div>

  <h2>Identificación</h2>
  <div class="ficha">
    ${campo('Mes/Año', mesAnioDesdeFecha(periodo.fechaPago))}
    ${campo('Legajo', empleado.legajo)}
    ${campo('Apellido y nombre', `${empleado.apellido}, ${empleado.nombre}`)}
    ${campo('C.U.I.L.', empleado.cuil)}
    ${campo('Banco', empleado.banco)}
    ${campo('Período', periodoAbreviado(periodo.anio, periodo.mes))}
    ${campo('Categoría', empleado.categoria)}
    ${campo('Fecha de ingreso', empleado.fechaIngreso)}
    ${campo('Antigüedad', empleado.antiguedad)}
    ${campo('Lugar y fecha de pago', `${periodo.lugarPago} — ${periodo.fechaPago}`)}
  </div>

  <h2>Contribuciones del empleador</h2>
  <div class="campo-suelto">${campo('Pago de cargas sociales', `${periodo.lugarPagoCargasSociales} — ${periodo.fechaPagoCargasSociales}`)}</div>
  ${destacado('Costo laboral total', totales.costoLaboralTotal, 'costo-laboral')}
  ${envolverTabla(filasContribuciones, totalContribuciones, mostrarCalculo)}

  <h2>Remuneración bruta y deducciones</h2>
  ${destacado('Sueldo bruto', totales.totalBruto)}
  ${envolverTabla(remunerativosPuros.map((c) => filaConcepto(c, mostrarCalculo)).join(''), totalRemunerativoFila, mostrarCalculo)}
  ${envolverTabla(noRemunerativos.map((c) => filaConcepto(c, mostrarCalculo)).join(''), totalNoRemunerativoFila, mostrarCalculo)}
  ${envolverTabla(deducciones.map((c) => filaConcepto(c, mostrarCalculo)).join(''), totalDeduccionesFila, mostrarCalculo)}

  <h2>Remuneración neta</h2>
  ${destacado('Sueldo neto', totales.neto, 'neto')}

  <div class="pie-firma">
    <p>Recibí conforme la suma indicada de ${formatearMonto(totales.neto)} (${escaparHtml(montoEnPalabras(totales.neto))}).</p>
    <div class="linea-firma">Firma del empleado</div>
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
</body>
</html>`;
}
