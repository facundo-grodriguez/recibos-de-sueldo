/** Antigüedad en texto (ej. "2 años y 3 meses") a una fecha de referencia dada. */
export function calcularAntiguedad(fechaIngreso: Date, fechaReferencia: Date): string {
  let anios = fechaReferencia.getFullYear() - fechaIngreso.getFullYear();
  let meses = fechaReferencia.getMonth() - fechaIngreso.getMonth();

  if (fechaReferencia.getDate() < fechaIngreso.getDate()) {
    meses -= 1;
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  if (anios < 0) {
    // Fecha de ingreso posterior a la fecha de referencia: no debería pasar
    // en un uso normal, pero no tiene sentido mostrar una antigüedad negativa.
    anios = 0;
    meses = 0;
  }

  const partes: string[] = [];
  if (anios > 0) {
    partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  }
  if (meses > 0 || anios === 0) {
    partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  }

  return partes.join(' y ');
}
