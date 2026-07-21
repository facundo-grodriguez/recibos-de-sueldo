import type { GrupoEmpleado } from './agruparFilasPorEmpleado';

export type FiltroEstadoRevision = 'todos' | 'error' | 'advertencia' | 'sinClasificar';

export interface OpcionesFiltradoRevision {
  busqueda: string;
  filtro: FiltroEstadoRevision;
}

/** Busca por nombre, apellido, CUIL del empleado, o por concepto de cualquiera de sus filas (ADR: buscador global). */
function grupoMatcheaBusqueda(grupo: GrupoEmpleado, texto: string): boolean {
  const consulta = texto.trim().toLowerCase();
  if (!consulta) return true;

  if (grupo.nombre.toLowerCase().includes(consulta)) return true;
  if (grupo.apellido.toLowerCase().includes(consulta)) return true;
  if (grupo.cuil.includes(consulta)) return true;
  return grupo.filas.some((fila) => fila.concepto.toLowerCase().includes(consulta));
}

/** El filtro de estado opera sobre el empleado, no sobre la fila: alcanza con que UNA fila matchee para mostrar todo el grupo. */
function grupoMatcheaFiltro(grupo: GrupoEmpleado, filtro: FiltroEstadoRevision): boolean {
  switch (filtro) {
    case 'todos':
      return true;
    case 'error':
      return grupo.filas.some((fila) => !fila.valida);
    case 'advertencia':
      return grupo.filas.some((fila) => fila.correcciones.length > 0);
    case 'sinClasificar':
      return grupo.filas.some((fila) => fila.valida && fila.tipo === null);
  }
}

export function filtrarGrupos(grupos: GrupoEmpleado[], opciones: OpcionesFiltradoRevision): GrupoEmpleado[] {
  return grupos.filter(
    (grupo) => grupoMatcheaBusqueda(grupo, opciones.busqueda) && grupoMatcheaFiltro(grupo, opciones.filtro),
  );
}
