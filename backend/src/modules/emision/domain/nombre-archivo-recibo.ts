import { NOMBRES_MES } from './nombre-mes';
import { Recibo } from './recibo.entity';

// Solo los caracteres realmente inválidos en un nombre de archivo (Windows es
// el conjunto más restrictivo, cubre también Unix) — nunca se tocan espacios,
// guiones ni acentos: el formato pedido los usa literalmente.
function sanitizarParaNombreDeArchivo(texto: string): string {
  // eslint-disable-next-line no-control-regex
  return texto.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
}

/**
 * Nomenclatura obligatoria y uniforme para cualquier PDF de recibo generado
 * (descarga individual o entradas dentro de un ZIP de lote), para que se
 * pueda identificar el contenido sin abrir el archivo:
 * "Recibo - Apellido Nombre - Mes Año.pdf".
 */
export function nombreArchivoRecibo(recibo: Recibo): string {
  const { apellido, nombre } = recibo.snapshot.empleado;
  const { anio, mes } = recibo.snapshot.periodo;
  const periodo = `${NOMBRES_MES[mes - 1]} ${anio}`;
  return sanitizarParaNombreDeArchivo(`Recibo - ${apellido} ${nombre} - ${periodo}.pdf`);
}
