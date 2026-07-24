import { DomainError } from '../../../shared/errors/domain-error';
import { Cuil } from '../../../shared/value-objects/cuil';
import { Money } from '../../../shared/value-objects/money';
import { FilaCanonica } from './fila-canonica';

export interface FilaImportacionValidada {
  cuil: Cuil;
  nombre: string;
  apellido: string;
  concepto: string;
  monto: Money;
  /** Informativos (ver FilaCanonica): nunca invalidan la fila si vienen mal. */
  unidad: string | null;
  base: number | null;
  /**
   * Normalizaciones de formato que esta fila ya recibió sin bloquearla (ej.
   * "CUIL: se le quitaron los guiones"). Puramente informativo, para que el
   * usuario vea qué se corrigió solo sin tener que re-subir el archivo —
   * nunca cambia el contenido semántico de un campo (no toca mayúsculas ni
   * reinterpreta texto, solo formato: espacios, separadores, puntuación).
   */
  correcciones: string[];
}

export type ResultadoValidacionFila =
  | { valida: true; datos: FilaImportacionValidada }
  | { valida: false; error: string };

function parsearMonto(raw: string): Money {
  // Acepta tanto "1234.56" como "1234,56" (formato argentino habitual en Excel).
  // Acepta 0 y negativos a propósito (investigación de datasets reales,
  // 2026-07-19): hay conceptos reales en $0 (ej. un encabezado de sección que
  // se liquida como fila con monto nulo) y pares que se cancelan entre sí
  // (un concepto positivo y su contrapartida negativa). Nunca liquidamos
  // (ADR-005), así que no nos corresponde juzgar si un monto real "tiene
  // sentido" — solo que sea un número.
  const normalizado = raw.trim().replace(',', '.');
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    throw new DomainError(`Monto inválido: "${raw}"`);
  }
  return Money.fromDecimal(numero);
}

/**
 * A diferencia de `parsearMonto`, nunca lanza: `base` es puramente
 * informativa (de dónde salió el monto ya liquidado), así que si viene mal
 * cargada la fila igual es válida — simplemente no se muestra esa base.
 * Si el origen no la informó, queda en `null` — nunca se infiere ni se
 * calcula un valor por defecto (ADR-071: fidelidad absoluta al origen).
 */
function parsearBaseOpcional(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const numero = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

/** Mismo principio que `parsearBaseOpcional` (ADR-071): ausente en el origen → `null`, nunca un valor asumido. */
function parsearUnidadOpcional(raw: string | undefined): string | null {
  const texto = raw?.trim();
  return texto ? texto : null;
}

/**
 * Compara el crudo del archivo contra el valor ya limpio para informar qué
 * se corrigió solo. Deliberadamente acotado a formato (espacios, separadores,
 * puntuación no numérica) — nunca a capitalización ni contenido, que son
 * decisiones que le corresponden a quien cargó el dato, no al sistema.
 */
function detectarCorrecciones(fila: FilaCanonica, limpio: { cuil: Cuil; nombre: string; apellido: string; concepto: string }): string[] {
  const correcciones: string[] = [];

  // Si esta fila heredó cuil/nombre/apellido de su fila ancla (ADR-072,
  // opción B), esos tres ya se evaluaron y avisaron una sola vez ahí: acá
  // serían siempre una repetición del mismo aviso, así que se saltan.
  if (!fila.identidadHeredada) {
    if (fila.cuil.trim() !== limpio.cuil.value) {
      correcciones.push('CUIL: se normalizó quitando espacios, guiones o puntos');
    }
    if (fila.nombre !== limpio.nombre) {
      correcciones.push('Nombre: se recortaron espacios de más');
    }
    if (fila.apellido !== limpio.apellido) {
      correcciones.push('Apellido: se recortaron espacios de más');
    }
  }
  if (fila.concepto !== limpio.concepto) {
    correcciones.push('Concepto: se recortaron espacios de más');
  }
  if (fila.monto.trim().includes(',')) {
    correcciones.push('Monto: se interpretó la coma como separador decimal');
  }

  return correcciones;
}

/**
 * Regla de negocio de la ingesta: qué hace válida a una fila del formato
 * largo. No aborta ante el primer error de la fila: junta todo lo posible
 * en un único mensaje para que el usuario corrija el archivo de una vez.
 */
export function validarFilaImportacion(fila: FilaCanonica): ResultadoValidacionFila {
  const errores: string[] = [];

  if (!fila.nombre.trim()) errores.push('el nombre es obligatorio');
  if (!fila.apellido.trim()) errores.push('el apellido es obligatorio');
  if (!fila.concepto.trim()) errores.push('el concepto es obligatorio');

  let cuil: Cuil | undefined;
  try {
    cuil = Cuil.create(fila.cuil);
  } catch (error) {
    errores.push(error instanceof DomainError ? error.message : 'CUIL inválido');
  }

  let monto: Money | undefined;
  try {
    monto = parsearMonto(fila.monto);
  } catch (error) {
    errores.push(error instanceof DomainError ? error.message : 'monto inválido');
  }

  if (errores.length > 0 || !cuil || !monto) {
    return { valida: false, error: errores.join('; ') };
  }

  const nombre = fila.nombre.trim();
  const apellido = fila.apellido.trim();
  const concepto = fila.concepto.trim();

  return {
    valida: true,
    datos: {
      cuil,
      nombre,
      apellido,
      concepto,
      monto,
      unidad: parsearUnidadOpcional(fila.unidad),
      base: parsearBaseOpcional(fila.base),
      correcciones: detectarCorrecciones(fila, { cuil, nombre, apellido, concepto }),
    },
  };
}
