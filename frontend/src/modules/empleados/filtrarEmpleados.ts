import type { Empleado } from './api';

export interface FiltroEmpleados {
  busqueda: string;
  mostrarInactivos: boolean;
}

/** Búsqueda/filtro client-side (Fase C): sin cambios de API, todo sobre la lista ya traída. */
export function filtrarEmpleados(empleados: Empleado[], { busqueda, mostrarInactivos }: FiltroEmpleados): Empleado[] {
  const texto = busqueda.trim().toLowerCase();

  return empleados.filter((empleado) => {
    if (!mostrarInactivos && empleado.estado === 'inactivo') return false;
    if (!texto) return true;
    return (
      empleado.nombre.toLowerCase().includes(texto) ||
      empleado.apellido.toLowerCase().includes(texto) ||
      empleado.cuil.includes(texto)
    );
  });
}
