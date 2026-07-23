import { TotalesEmpleado } from './resultado-validacion';

/** Variación de neto respecto del período anterior que dispara una advertencia (no bloqueante). */
export const UMBRAL_VARIACION_NETO = 0.3;

export interface ReglasEmpleadoResultado {
  errores: string[];
  advertencias: string[];
}

/**
 * Ficha del trabajador a validar (categoría laboral y fecha de ingreso), o
 * `null` cuando no corresponde exigirla — hoy el único caso es un empleado
 * inactivo: no se le emite recibo (ver `EmitirRecibosUseCase`), así que no
 * corresponde bloquear la importación por su ficha incompleta.
 */
export interface FichaEmpleadoValidacion {
  categoria: string | null;
  fechaIngreso: Date | null;
}

/**
 * Reglas de negocio de Validación (Anexo III) para un empleado dentro de una
 * importación. `netoAnterior` es el neto de ese mismo empleado en el período
 * confirmado comparable más reciente, o null si no hay uno.
 */
export function evaluarReglasEmpleado(
  totales: TotalesEmpleado,
  netoAnterior: number | null,
  ficha: FichaEmpleadoValidacion | null,
): ReglasEmpleadoResultado {
  const errores: string[] = [];
  const advertencias: string[] = [];

  if (totales.totalBruto === 0) {
    errores.push('No tiene ningún concepto remunerativo');
  }

  if (totales.neto < 0) {
    errores.push(`El neto calculado es negativo (${totales.neto})`);
  }

  // Categoría laboral y fecha de ingreso son parte de la información mínima
  // para reconstruir el Anexo III (docs/modelo-funcional-anexo-iii.md,
  // sección 10) — a diferencia de legajo/banco, que siguen siendo opcionales.
  if (ficha) {
    if (!ficha.categoria) {
      errores.push('Falta la categoría laboral en la ficha del empleado');
    }
    if (!ficha.fechaIngreso) {
      errores.push('Falta la fecha de ingreso en la ficha del empleado');
    }
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
