/**
 * Antigüedad en texto (ej. "2 años y 3 meses") a una fecha de referencia dada.
 * Réplica exacta de `calcularAntiguedad` del backend (`emision/domain/calcular-antiguedad.ts`)
 * — sin paquete compartido entre frontend/backend en este proyecto (mismo criterio ya usado
 * para los esquemas de Zod duplicados en el cliente), así que se mantiene 1:1 a propósito.
 */
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
