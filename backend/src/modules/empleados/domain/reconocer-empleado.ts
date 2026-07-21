/**
 * Servicio de dominio de reconocimiento de empleados (ADR-077, "constitución de datos").
 *
 * Materializa el principio "el sistema solicita una única vez la información que ya conoce
 * y la reutiliza": dado el identificador que trae cualquier origen, reconoce si el empleado
 * ya existe y **completa la identidad faltante** (nombre/apellido) desde lo ya registrado.
 *
 * Es puro y agnóstico del origen (no depende de `FilaCanonica` ni de la importación) — así lo
 * reutilizarán importación, carga asistida, futuros conectores ERP y búsquedas internas.
 *
 * Reconoce por **CUIL** (identidad canónica). El Legajo, como identificador secundario del
 * origen, queda para un slice posterior (requiere que el origen lo transporte).
 *
 * Regla de fidelidad (ADR-071/077): nunca modifica un dato que sí vino del origen. Si el
 * origen trae un nombre/apellido distinto al registrado, **avisa** pero mantiene el del origen;
 * la resolución de ese conflicto es una decisión explícita del usuario, nunca automática.
 */

/** Identidad tal como la trae un origen (texto crudo), antes de validar. */
export interface IdentidadEmpleado {
  cuil: string;
  nombre: string;
  apellido: string;
}

/** Un empleado ya registrado de la empresa, con su CUIL normalizado (solo dígitos). */
export interface EmpleadoConocido {
  cuil: string;
  nombre: string;
  apellido: string;
}

export interface ResultadoReconocimiento {
  /** La identidad con nombre/apellido completados desde el registro cuando corresponde. */
  identidad: IdentidadEmpleado;
  /** Observaciones informativas (identidad completada, conflicto detectado) — nunca bloquean. */
  correcciones: string[];
}

/** Solo dígitos: el CUIL puede venir del origen con guiones/puntos/espacios. */
export function normalizarCuil(cuil: string): string {
  return cuil.replace(/[^0-9]/g, '');
}

/** Compara nombres ignorando mayúsculas y espacios de más — una diferencia de sola capitalización no es un conflicto. */
function difieren(unValor: string, otroValor: string): boolean {
  return unValor.trim().toLowerCase() !== otroValor.trim().toLowerCase();
}

/**
 * Índice de los empleados ya registrados de una empresa, por CUIL normalizado.
 * Se construye una vez por proceso (una sola consulta a la base) y se reutiliza para
 * reconocer todas las identidades del lote.
 */
export function indexarEmpleadosConocidos(empleados: EmpleadoConocido[]): Map<string, EmpleadoConocido> {
  return new Map(empleados.map((empleado) => [normalizarCuil(empleado.cuil), empleado]));
}

/**
 * Reconoce una identidad contra los empleados ya registrados. Si el empleado existe:
 * completa nombre/apellido ausentes desde el registro (no volver a pedir lo conocido), y
 * avisa —sin cambiar nada— si un valor presente difiere del registrado. Si no existe (o no
 * hay CUIL utilizable), devuelve la identidad tal cual: es un alta nueva, no hay nada que reconocer.
 */
export function reconocerEmpleado(
  identidad: IdentidadEmpleado,
  indice: Map<string, EmpleadoConocido>,
): ResultadoReconocimiento {
  const conocido = indice.get(normalizarCuil(identidad.cuil));
  if (!conocido) {
    return { identidad, correcciones: [] };
  }

  const correcciones: string[] = [];
  const completado: IdentidadEmpleado = { ...identidad };

  const camposCompletados: string[] = [];
  if (!identidad.nombre.trim()) {
    completado.nombre = conocido.nombre;
    camposCompletados.push('nombre');
  } else if (difieren(identidad.nombre, conocido.nombre)) {
    correcciones.push(
      `El nombre del archivo ("${identidad.nombre}") difiere del registrado ("${conocido.nombre}"); se mantiene el del archivo`,
    );
  }

  if (!identidad.apellido.trim()) {
    completado.apellido = conocido.apellido;
    camposCompletados.push('apellido');
  } else if (difieren(identidad.apellido, conocido.apellido)) {
    correcciones.push(
      `El apellido del archivo ("${identidad.apellido}") difiere del registrado ("${conocido.apellido}"); se mantiene el del archivo`,
    );
  }

  if (camposCompletados.length > 0) {
    correcciones.push(
      `${camposCompletados.length === 2 ? 'Nombre y apellido' : camposCompletados[0] === 'nombre' ? 'Nombre' : 'Apellido'} completado${camposCompletados.length === 2 ? 's' : ''} desde el empleado ya registrado`,
    );
  }

  return { identidad: completado, correcciones };
}
