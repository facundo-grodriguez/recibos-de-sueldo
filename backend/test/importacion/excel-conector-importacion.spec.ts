import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { ExcelConectorImportacion } from '../../src/modules/importacion/infrastructure/excel-conector-importacion';

const conector = new ExcelConectorImportacion();

async function construirBufferExcel(encabezados: string[], filas: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet('Datos');
  hoja.addRow(encabezados);
  for (const fila of filas) {
    hoja.addRow(fila);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('ExcelConectorImportacion', () => {
  it('parsea un Excel válido en filas canónicas, numerando desde la fila 2', async () => {
    const buffer = await construirBufferExcel(
      ['cuil', 'nombre', 'apellido', 'concepto', 'monto'],
      [
        ['27309876542', 'Juan', 'Perez', 'Sueldo básico', 1500.5],
        ['20123456786', 'Ana', 'Gomez', 'Antigüedad', 300],
      ],
    );

    const filas = await conector.parse(buffer);

    expect(filas).toHaveLength(2);
    expect(filas[0]).toEqual({
      numeroFila: 2,
      cuil: '27309876542',
      nombre: 'Juan',
      apellido: 'Perez',
      concepto: 'Sueldo básico',
      monto: '1500.5',
    });
    expect(filas[1].numeroFila).toBe(3);
  });

  it('rechaza un archivo al que le falta una columna obligatoria', async () => {
    const buffer = await construirBufferExcel(
      ['cuil', 'nombre', 'apellido', 'monto'],
      [['27309876542', 'Juan', 'Perez', '1500']],
    );

    await expect(conector.parse(buffer)).rejects.toThrow(DomainError);
  });

  it('rechaza un archivo sin filas de datos', async () => {
    const buffer = await construirBufferExcel(['cuil', 'nombre', 'apellido', 'concepto', 'monto'], []);

    await expect(conector.parse(buffer)).rejects.toThrow(DomainError);
  });

  it('tolera encabezados en mayúsculas o con espacios de más', async () => {
    const buffer = await construirBufferExcel(
      [' CUIL ', 'Nombre', 'APELLIDO', 'Concepto', 'Monto'],
      [['27309876542', 'Juan', 'Perez', 'Sueldo básico', 1500.5]],
    );

    const filas = await conector.parse(buffer);

    expect(filas).toHaveLength(1);
    expect(filas[0].cuil).toBe('27309876542');
  });

  it('tolera que las columnas vengan en cualquier orden', async () => {
    const buffer = await construirBufferExcel(
      ['monto', 'concepto', 'apellido', 'nombre', 'cuil'],
      [[1500.5, 'Sueldo básico', 'Perez', 'Juan', '27309876542']],
    );

    const filas = await conector.parse(buffer);

    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      cuil: '27309876542',
      nombre: 'Juan',
      apellido: 'Perez',
      concepto: 'Sueldo básico',
      monto: '1500.5',
    });
  });

  it('salta filas completamente vacías (frecuentes al final de un Excel exportado), preservando el número de fila real', async () => {
    const buffer = await construirBufferExcel(
      ['cuil', 'nombre', 'apellido', 'concepto', 'monto'],
      [
        ['27309876542', 'Juan', 'Perez', 'Sueldo básico', 1500.5],
        ['', '', '', '', ''],
        ['20123456786', 'Ana', 'Gomez', 'Antigüedad', 300],
      ],
    );

    const filas = await conector.parse(buffer);

    expect(filas).toHaveLength(2);
    expect(filas[1].numeroFila).toBe(4);
  });

  it('rechaza un buffer que no es un Excel válido', async () => {
    await expect(conector.parse(Buffer.from('esto no es un xlsx', 'utf-8'))).rejects.toThrow(DomainError);
  });
});
