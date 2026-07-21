import type { ImportacionFila } from '../api';

/** Clave interna del grupo que junta las filas sin CUIL utilizable (no se puede agrupar por identidad). */
const SIN_IDENTIFICAR = '__sin_identificar__';

export interface GrupoEmpleado {
  /** Clave estable de React/orden — el CUIL tal cual viene en las filas, o el sentinel de "sin identificar". */
  clave: string;
  /** CUIL normalizado (ya limpio para filas válidas — ver `ImportarArchivoUseCase`). Vacío en el grupo "sin identificar". */
  cuil: string;
  nombre: string;
  apellido: string;
  filas: ImportacionFila[];
  sinIdentificar: boolean;
}

export interface ResumenGrupo {
  conceptos: number;
  validos: number;
  errores: number;
  /** Filas con al menos una corrección automática (CUIL normalizado, herencia de fila, coma decimal, etc.) — no negocio. */
  correcciones: number;
  tieneError: boolean;
  tieneAdvertencia: boolean;
}

/**
 * Agrupa las filas de una importación por empleado, preservando el orden original del
 * archivo (posición de la primera fila de cada CUIL) — decisión explícita del usuario:
 * facilita la correspondencia visual con el Excel de origen abierto en paralelo.
 *
 * Las filas sin CUIL (vacío tras trim) no se pueden agrupar por identidad — a diferencia
 * del backend (`Importacion.agruparFilasPorCuilValido`, que directamente las descarta),
 * acá se conservan en un grupo especial "sin identificar": son las más urgentes de
 * corregir y no deben desaparecer de la vista.
 */
export function agruparFilasPorEmpleado(filas: ImportacionFila[]): GrupoEmpleado[] {
  const grupos = new Map<string, GrupoEmpleado>();

  for (const fila of filas) {
    const cuil = fila.cuil.trim();
    const clave = cuil || SIN_IDENTIFICAR;
    const grupoExistente = grupos.get(clave);

    if (grupoExistente) {
      grupoExistente.filas.push(fila);
      continue;
    }

    grupos.set(clave, {
      clave,
      cuil,
      nombre: cuil ? fila.nombre : '',
      apellido: cuil ? fila.apellido : '',
      filas: [fila],
      sinIdentificar: !cuil,
    });
  }

  return [...grupos.values()];
}

/**
 * El grupo "sin identificar" (sin CUIL) siempre usa esa etiqueta. Un grupo con CUIL pero sin
 * nombre/apellido (fila inválida cuyo error es justamente la identidad) no debe mostrar ", "
 * vacío — cae a mostrar el CUIL como título en su lugar. Compartido entre el encabezado del
 * grupo y la barra lateral de navegación, para no duplicar el criterio en dos lugares.
 */
export function tituloGrupo(grupo: GrupoEmpleado): string {
  if (grupo.sinIdentificar) return 'Sin identificar';
  if (!grupo.nombre && !grupo.apellido) return `CUIL ${grupo.cuil} (sin nombre)`;
  return `${grupo.apellido}, ${grupo.nombre}`;
}

/** Conteos derivados de un grupo, usados tanto en su encabezado como en la barra lateral de navegación. */
export function resumenGrupo(grupo: GrupoEmpleado): ResumenGrupo {
  const errores = grupo.filas.filter((fila) => !fila.valida).length;
  const correcciones = grupo.filas.filter((fila) => fila.correcciones.length > 0).length;

  return {
    conceptos: grupo.filas.length,
    validos: grupo.filas.length - errores,
    errores,
    correcciones,
    tieneError: errores > 0,
    tieneAdvertencia: correcciones > 0,
  };
}
