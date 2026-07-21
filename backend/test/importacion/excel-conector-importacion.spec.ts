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

    const { filas, correcciones } = await conector.parse(buffer);

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
    expect(correcciones).toEqual([]);
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

    const { filas } = await conector.parse(buffer);

    expect(filas).toHaveLength(1);
    expect(filas[0].cuil).toBe('27309876542');
  });

  it('tolera que las columnas vengan en cualquier orden', async () => {
    const buffer = await construirBufferExcel(
      ['monto', 'concepto', 'apellido', 'nombre', 'cuil'],
      [[1500.5, 'Sueldo básico', 'Perez', 'Juan', '27309876542']],
    );

    const { filas } = await conector.parse(buffer);

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

    const { filas } = await conector.parse(buffer);

    expect(filas).toHaveLength(2);
    expect(filas[1].numeroFila).toBe(4);
  });

  it('rechaza un buffer que no es un Excel válido', async () => {
    await expect(conector.parse(Buffer.from('esto no es un xlsx', 'utf-8'))).rejects.toThrow(DomainError);
  });

  describe('herencia de CUIL/nombre/apellido en filas repetidas (ADR-072, opción B)', () => {
    it('hereda CUIL, nombre y apellido de la última fila completa cuando los 3 vienen vacíos', async () => {
      const buffer = await construirBufferExcel(
        ['cuil', 'nombre', 'apellido', 'concepto', 'monto'],
        [
          ['27309876542', 'Juan', 'Perez', 'Sueldo básico', 1500.5],
          ['', '', '', 'Antigüedad', 300],
          ['', '', '', 'Presentismo', 200],
        ],
      );

      const { filas, correcciones } = await conector.parse(buffer);

      expect(filas).toHaveLength(3);
      expect(filas[1]).toMatchObject({ cuil: '27309876542', nombre: 'Juan', apellido: 'Perez' });
      expect(filas[2]).toMatchObject({ cuil: '27309876542', nombre: 'Juan', apellido: 'Perez' });
      expect(correcciones).toEqual([
        { numeroFila: 3, mensaje: 'CUIL, nombre y apellido heredados de la fila 2' },
        { numeroFila: 4, mensaje: 'CUIL, nombre y apellido heredados de la fila 2' },
      ]);
    });

    it('no hereda si solo alguno de los 3 campos viene vacío (sigue siendo un dato faltante real)', async () => {
      const buffer = await construirBufferExcel(
        ['cuil', 'nombre', 'apellido', 'concepto', 'monto'],
        [
          ['27309876542', 'Juan', 'Perez', 'Sueldo básico', 1500.5],
          ['', 'Juan', 'Perez', 'Antigüedad', 300],
        ],
      );

      const { filas, correcciones } = await conector.parse(buffer);

      expect(filas[1]).toMatchObject({ cuil: '', nombre: 'Juan', apellido: 'Perez' });
      expect(correcciones).toEqual([]);
    });

    it('no hereda nada si no hay ninguna fila previa completa (queda vacío, como hoy)', async () => {
      const buffer = await construirBufferExcel(
        ['cuil', 'nombre', 'apellido', 'concepto', 'monto'],
        [['', '', '', 'Sueldo básico', 1500.5]],
      );

      const { filas, correcciones } = await conector.parse(buffer);

      expect(filas[0]).toMatchObject({ cuil: '', nombre: '', apellido: '' });
      expect(correcciones).toEqual([]);
    });

    it('vuelve a heredar de un segundo empleado distinto una vez que aparece una fila completa nueva', async () => {
      const buffer = await construirBufferExcel(
        ['cuil', 'nombre', 'apellido', 'concepto', 'monto'],
        [
          ['27309876542', 'Juan', 'Perez', 'Sueldo básico', 1500.5],
          ['', '', '', 'Antigüedad', 300],
          ['20123456786', 'Ana', 'Gomez', 'Sueldo básico', 1600],
          ['', '', '', 'Antigüedad', 320],
        ],
      );

      const { filas, correcciones } = await conector.parse(buffer);

      expect(filas[1]).toMatchObject({ cuil: '27309876542', nombre: 'Juan', apellido: 'Perez' });
      expect(filas[3]).toMatchObject({ cuil: '20123456786', nombre: 'Ana', apellido: 'Gomez' });
      expect(correcciones).toEqual([
        { numeroFila: 3, mensaje: 'CUIL, nombre y apellido heredados de la fila 2' },
        { numeroFila: 5, mensaje: 'CUIL, nombre y apellido heredados de la fila 4' },
      ]);
    });
  });
});
