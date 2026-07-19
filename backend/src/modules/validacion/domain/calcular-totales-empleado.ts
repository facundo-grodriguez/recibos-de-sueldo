import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';
import { TotalesEmpleado } from './resultado-validacion';

/**
 * Cuadre de totales de un empleado dentro de una importación (Anexo III):
 * bruto = remunerativo + no_remunerativo; neto = bruto - deducciones;
 * costo laboral total = bruto + contribuciones patronales.
 * Las filas sin clasificar todavía se ignoran acá (se reportan aparte como
 * error global de la importación, no distorsionan estos totales parciales).
 */
export function calcularTotalesEmpleado(filas: ImportacionFila[]): TotalesEmpleado {
  let totalBruto = 0;
  let totalDeducciones = 0;
  let totalContribucionesPatronales = 0;

  for (const fila of filas) {
    if (!fila.valida || fila.monto === null || !fila.clasificacion) {
      continue;
    }

    switch (fila.clasificacion.tipo) {
      case 'remunerativo':
      case 'no_remunerativo':
        totalBruto += fila.monto;
        break;
      case 'deduccion':
        totalDeducciones += fila.monto;
        break;
      case 'contribucion_patronal':
        totalContribucionesPatronales += fila.monto;
        break;
    }
  }

  return {
    totalBruto,
    totalDeducciones,
    totalContribucionesPatronales,
    neto: totalBruto - totalDeducciones,
    costoLaboralTotal: totalBruto + totalContribucionesPatronales,
  };
}
