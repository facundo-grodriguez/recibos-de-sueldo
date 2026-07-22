import type { ImportacionResumen } from './api';
import { NOMBRES_MES } from './nombresMes';

/** Búsqueda client-side (Etapa 2 UX): sin cambios de API, todo sobre la lista ya traída — mismo patrón que `filtrarEmpleados`. */
export function filtrarImportaciones(importaciones: ImportacionResumen[], busqueda: string): ImportacionResumen[] {
  const texto = busqueda.trim().toLowerCase();
  if (!texto) return importaciones;

  return importaciones.filter((importacion) => {
    const periodo = `${NOMBRES_MES[importacion.mes - 1]} ${importacion.anio}`.toLowerCase();
    return (
      importacion.nombreArchivo.toLowerCase().includes(texto) ||
      periodo.includes(texto) ||
      String(importacion.anio).includes(texto)
    );
  });
}
