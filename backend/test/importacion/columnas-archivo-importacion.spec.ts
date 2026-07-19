import { describe, expect, it } from 'vitest';
import {
  columnasObligatoriasFaltantes,
  mapearRegistroPorEncabezado,
} from '../../src/modules/importacion/domain/columnas-archivo-importacion';

describe('mapearRegistroPorEncabezado', () => {
  it('normaliza mayúsculas y espacios de más en las claves', () => {
    const registro = mapearRegistroPorEncabezado({ ' CUIL ': '27309876542', Nombre: 'Juan' });

    expect(registro).toEqual({ cuil: '27309876542', nombre: 'Juan' });
  });

  it('convierte valores null/undefined en cadena vacía, y recorta espacios de los valores', () => {
    const registro = mapearRegistroPorEncabezado({ cuil: '  27309876542  ', concepto: null, base: undefined });

    expect(registro).toEqual({ cuil: '27309876542', concepto: '', base: '' });
  });

  it('stringifica valores no textuales (ej. números de una celda de Excel)', () => {
    const registro = mapearRegistroPorEncabezado({ monto: 1500.5 });

    expect(registro).toEqual({ monto: '1500.5' });
  });
});

describe('columnasObligatoriasFaltantes', () => {
  it('no reporta nada si están las 5 columnas obligatorias, en cualquier mayúscula', () => {
    const faltantes = columnasObligatoriasFaltantes(['CUIL', 'Nombre', 'apellido', 'Concepto', 'MONTO']);
    expect(faltantes).toEqual([]);
  });

  it('reporta las columnas obligatorias que faltan', () => {
    const faltantes = columnasObligatoriasFaltantes(['cuil', 'nombre']);
    expect(faltantes).toEqual(['apellido', 'concepto', 'monto']);
  });

  it('no le importan columnas opcionales o desconocidas de más', () => {
    const faltantes = columnasObligatoriasFaltantes(['cuil', 'nombre', 'apellido', 'concepto', 'monto', 'unidad', 'base', 'comentario']);
    expect(faltantes).toEqual([]);
  });
});
