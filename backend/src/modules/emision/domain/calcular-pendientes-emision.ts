import { Empleado } from '../../empleados/domain/empleado.entity';
import { ImportacionFila } from '../../importacion/domain/importacion-fila.entity';

export interface EmpleadoPendienteDeEmision {
  empleado: Empleado;
  filas: ImportacionFila[];
}

/**
 * Empleados de una importación confirmada que todavía no tienen recibo: activos,
 * con filas válidas en esta importación, y sin un recibo ya generado (vigente o
 * anulado — la reemisión de uno anulado es responsabilidad de `ReemitirReciboUseCase`,
 * no de este flujo). Mismo filtro que decide qué se emite de verdad en
 * `EmitirRecibosUseCase` — compartido para que "lo que falta emitir" (ej. la acción
 * "Emitir pendientes" tras reactivar a alguien) nunca diverja de "lo que se emitiría".
 */
export function calcularEmpleadosPendientesDeEmision(
  filasPorCuil: Map<string, ImportacionFila[]>,
  empleadosPorCuil: Map<string, Empleado>,
  empleadosYaEmitidos: Set<string>,
): EmpleadoPendienteDeEmision[] {
  const pendientes: EmpleadoPendienteDeEmision[] = [];
  for (const [cuil, filas] of filasPorCuil) {
    const empleado = empleadosPorCuil.get(cuil);
    if (!empleado || empleado.estado === 'inactivo' || empleadosYaEmitidos.has(empleado.id)) {
      continue;
    }
    pendientes.push({ empleado, filas });
  }
  return pendientes;
}
