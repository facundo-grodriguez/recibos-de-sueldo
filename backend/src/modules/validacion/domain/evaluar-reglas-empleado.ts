import { TotalesEmpleado } from './resultado-validacion';

/** Variación de neto respecto del período anterior que dispara una advertencia (no bloqueante). */
export const UMBRAL_VARIACION_NETO = 0.3;

export interface ReglasEmpleadoResultado {
  errores: string[];
  advertencias: string[];
}

/**
 * Reglas de negocio de Validación (Anexo III) para un empleado dentro de una
 * importación. `netoAnterior` es el neto de ese mismo empleado en el período
 * confirmado comparable más reciente, o null si no hay uno.
 */
export function evaluarReglasEmpleado(
  totales: TotalesEmpleado,
  netoAnterior: number | null,
): ReglasEmpleadoResultado {
  const errores: string[] = [];
  const advertencias: string[] = [];

  if (totales.totalBruto === 0) {
    errores.push('No tiene ningún concepto remunerativo');
  }

  if (totales.neto < 0) {
    errores.push(`El neto calculado es negativo (${totales.neto})`);
  }

  if (netoAnterior !== null && netoAnterior !== 0) {
    const variacion = Math.abs(totales.neto - netoAnterior) / Math.abs(netoAnterior);
    if (variacion > UMBRAL_VARIACION_NETO) {
      const porcentaje = Math.round(variacion * 100);
      advertencias.push(
        `El neto varió ${porcentaje}% respecto del período anterior (antes: ${netoAnterior}, ahora: ${totales.neto})`,
      );
    }
  }

  return { errores, advertencias };
}
