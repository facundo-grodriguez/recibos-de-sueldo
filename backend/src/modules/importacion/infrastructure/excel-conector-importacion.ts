import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DomainError } from '../../../shared/errors/domain-error';
import { columnasObligatoriasFaltantes, mapearRegistroPorEncabezado } from '../domain/columnas-archivo-importacion';
import { ConectorImportacion } from '../domain/conector-importacion';
import { FilaCanonica } from '../domain/fila-canonica';

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
  async parse(buffer: Buffer): Promise<FilaCanonica[]> {
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
      filas.push({
        numeroFila,
        cuil: registro.cuil ?? '',
        nombre: registro.nombre ?? '',
        apellido: registro.apellido ?? '',
        concepto: registro.concepto ?? '',
        monto: registro.monto ?? '',
        unidad: registro.unidad,
        base: registro.base,
      });
    }

    if (filas.length === 0) {
      throw new DomainError('El archivo no contiene filas para importar');
    }

    return filas;
  }
}
