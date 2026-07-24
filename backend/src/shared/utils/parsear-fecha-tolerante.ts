const FORMATO_ARGENTINO = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}/;

/**
 * Parsea una fecha "de ficha" (ej. fecha de ingreso) tolerando los dos
 * formatos que puede traer un Excel: texto en formato argentino
 * (`dd/mm/yyyy` o `dd-mm-yyyy`) o ISO (cuando la celda es una fecha real de
 * Excel, `textoDeCelda` ya la vuelca como ISO — ver excel-conector-
 * importacion.ts). Nunca lanza: es un dato informativo de ficha (ADR-071),
 * no de liquidación — si no se puede interpretar, se ignora en vez de
 * bloquear la fila o inventar un valor.
 */
export function parsearFechaTolerante(raw: string | null | undefined): Date | null {
  const texto = raw?.trim();
  if (!texto) return null;

  const matchArgentino = FORMATO_ARGENTINO.exec(texto);
  if (matchArgentino) {
    const [, diaTexto, mesTexto, anioTexto] = matchArgentino;
    const dia = Number(diaTexto);
    const mes = Number(mesTexto);
    const anio = Number(anioTexto);
    return fechaValida(anio, mes, dia);
  }

  if (FORMATO_ISO.test(texto)) {
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  return null;
}

/** Construye la fecha y verifica que los componentes no se hayan "desbordado" (ej. 31/02 no es el 3 de marzo). */
function fechaValida(anio: number, mes: number, dia: number): Date | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const seDesbordo = fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia;
  return seDesbordo ? null : fecha;
}
