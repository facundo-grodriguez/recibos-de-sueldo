import type { ImportacionResumen } from './api';
import { NOMBRES_MES } from './nombresMes';

export interface FiltroImportaciones {
  busqueda: string;
  /** Etapa 3: las descartadas se ocultan por defecto — mismo patrón que "Mostrar inactivos" en Empleados. */
  mostrarDescartadas: boolean;
}

/** Búsqueda/filtro client-side (Etapa 2/3 UX): sin cambios de API, todo sobre la lista ya traída — mismo patrón que `filtrarEmpleados`. */
export function filtrarImportaciones(
  importaciones: ImportacionResumen[],
  { busqueda, mostrarDescartadas }: FiltroImportaciones,
): ImportacionResumen[] {
  const texto = busqueda.trim().toLowerCase();

  return importaciones.filter((importacion) => {
    if (!mostrarDescartadas && importacion.estado === 'descartada') return false;
    if (!texto) return true;
    const periodo = `${NOMBRES_MES[importacion.mes - 1]} ${importacion.anio}`.toLowerCase();
    return (
      importacion.nombreArchivo.toLowerCase().includes(texto) ||
      periodo.includes(texto) ||
      String(importacion.anio).includes(texto)
    );
  });
}
