import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DomainError } from '../../../shared/errors/domain-error';
import { columnasObligatoriasFaltantes, mapearRegistroPorEncabezado } from '../domain/columnas-archivo-importacion';
import { CorreccionAdaptador, ConectorImportacion, ResultadoParseoConector } from '../domain/conector-importacion';
import { FilaCanonica } from '../domain/fila-canonica';

/** Identidad de la última fila con CUIL/nombre/apellido completos, para heredarla en filas que los repiten vacíos. */
interface IdentidadPrevia {
  numeroFila: number;
  cuil: string;
  nombre: string;
  apellido: string;
}

// La columna de fecha de ingreso admite algunos alias de encabezado (a
// diferencia de las otras columnas de ficha, que son de una sola palabra):
// quien arma el Excel puede escribir cualquiera de estos y el parser los
// entiende igual, sin que el usuario tenga que acertar el nombre exacto.
const CLAVES_FECHA_INGRESO = ['fecha ingreso', 'fecha de ingreso', 'fechaingreso'];

/** Primer alias de "fecha ingreso" presente en el registro normalizado, o undefined si no vino ninguno. */
function valorFechaIngreso(registro: Record<string, string>): string | undefined {
  return CLAVES_FECHA_INGRESO.map((clave) => registro[clave]).find((valor) => valor !== undefined);
}

/** Texto plano de una celda, cubriendo los tipos que exceljs puede devolver (texto enriquecido, fórmulas, fechas). */
function textoDeCelda(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('text' in valor && typeof valor.text === 'string') return valor.text;
    if ('result' in valor && valor.result !== undefined && valor.result !== null) return String(valor.result);
    return '';
  }
  return String(valor);
}

@Injectable()
export class ExcelConectorImportacion implements ConectorImportacion {
  async parse(buffer: Buffer): Promise<ResultadoParseoConector> {
    const workbook = new ExcelJS.Workbook();
    try {
      // exceljs trae, vía fast-csv, un @types/node@14 anidado cuyo `Buffer`
      // (no genérico) es un tipo distinto del `Buffer<ArrayBufferLike>` del
      // proyecto — chocan estructuralmente entre sí aunque compartan nombre.
      // Un cast a `unknown` no alcanza (`Buffer` acá sigue resolviendo al del
      // proyecto, no al que exceljs espera); es un conflicto puramente de
      // tipos, nunca de runtime, así que `any` es la salida correcta.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);
    } catch (error) {
      throw new DomainError(`No se pudo leer el archivo Excel: ${(error as Error).message}`);
    }

    const hoja = workbook.worksheets[0];
    if (!hoja) {
      throw new DomainError('El archivo Excel no contiene ninguna hoja');
    }

    const encabezadosCrudos: string[] = [];
    hoja.getRow(1).eachCell({ includeEmpty: true }, (celda, columna) => {
      encabezadosCrudos[columna] = textoDeCelda(celda.value);
    });

    const faltantes = columnasObligatoriasFaltantes(encabezadosCrudos.filter(Boolean));
    if (faltantes.length > 0) {
      throw new DomainError(
        `Faltan columnas obligatorias en el archivo: ${faltantes.join(', ')}. ` +
          `Se esperan: cuil, nombre, apellido, concepto, monto`,
      );
    }

    const filas: FilaCanonica[] = [];
    const correcciones: CorreccionAdaptador[] = [];
    let identidadPrevia: IdentidadPrevia | undefined;

    for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila++) {
      const filaExcel = hoja.getRow(numeroFila);
      const registroCrudo: Record<string, string> = {};
      let tieneAlgunValor = false;

      filaExcel.eachCell({ includeEmpty: true }, (celda, columna) => {
        const encabezado = encabezadosCrudos[columna];
        if (!encabezado) return;
        const texto = textoDeCelda(celda.value);
        registroCrudo[encabezado] = texto;
        if (texto.trim() !== '') tieneAlgunValor = true;
      });

      // Filas totalmente vacías (frecuentes al final de un Excel exportado) se
      // saltan sin correr la numeración: el número reportado siempre es la
      // fila real del archivo, igual que ya garantiza el conector CSV.
      if (!tieneAlgunValor) continue;

      const registro = mapearRegistroPorEncabezado(registroCrudo);
      let cuil = registro.cuil ?? '';
      let nombre = registro.nombre ?? '';
      let apellido = registro.apellido ?? '';

      // Tolerancia del parser (no cambia el contrato): si CUIL, nombre y
      // apellido vienen los 3 vacíos juntos, se heredan de la última fila que
      // sí los traía completos — evita repetirlos en cada concepto del mismo
      // empleado. Nunca se hereda si solo alguno de los 3 falta: eso sigue
      // siendo un dato faltante real, no una repetición intencional.
      //
      // El aviso de normalización de esa identidad (ADR-072, opción B) ya se
      // generó una sola vez, en la fila ancla que la trajo completa: acá solo
      // se marca `identidadHeredada` para que el validador sepa que estos tres
      // campos son una copia y no vuelva a evaluarlos por fila.
      let identidadHeredada: true | undefined;
      if (!cuil.trim() && !nombre.trim() && !apellido.trim() && identidadPrevia) {
        cuil = identidadPrevia.cuil;
        nombre = identidadPrevia.nombre;
        apellido = identidadPrevia.apellido;
        identidadHeredada = true;
      } else if (cuil.trim() && nombre.trim() && apellido.trim()) {
        identidadPrevia = { numeroFila, cuil, nombre, apellido };
      }

      filas.push({
        numeroFila,
        cuil,
        nombre,
        apellido,
        concepto: registro.concepto ?? '',
        monto: registro.monto ?? '',
        unidad: registro.unidad,
        base: registro.base,
        identidadHeredada,
        // Etapa "primera importación" (ver FilaCanonica): igual que
        // unidad/base, se leen tal cual vienen en esta fila, sin heredarlas
        // de otra — la convención es completarlas solo en la fila ancla de
        // cada empleado; si se completan en otra fila, no se van a tomar
        // (ConfirmarImportacionUseCase solo mira la primera fila de cada
        // CUIL al dar de alta un empleado nuevo).
        legajo: registro.legajo,
        categoria: registro.categoria,
        fechaIngreso: valorFechaIngreso(registro),
        banco: registro.banco,
      });
    }

    if (filas.length === 0) {
      throw new DomainError('El archivo no contiene filas para importar');
    }

    return { filas, correcciones };
  }
}
