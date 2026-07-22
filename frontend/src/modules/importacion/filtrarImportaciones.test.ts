import { describe, expect, it } from 'vitest';
import type { ImportacionResumen } from './api';
import { filtrarImportaciones } from './filtrarImportaciones';

function importacion(overrides: Partial<ImportacionResumen> = {}): ImportacionResumen {
  return {
    id: '1',
    anio: 2026,
    mes: 7,
    nombreArchivo: 'liquidacion.xlsx',
    estado: 'previsualizada',
    fechaImportacion: '2026-07-01T00:00:00.000Z',
    totalFilas: 10,
    filasValidas: 10,
    filasConError: 0,
    ...overrides,
  };
}

describe('filtrarImportaciones', () => {
  const importaciones = [
    importacion({ id: '1', anio: 2026, mes: 7, nombreArchivo: 'julio.xlsx' }),
    importacion({ id: '2', anio: 2026, mes: 8, nombreArchivo: 'agosto.xlsx' }),
  ];

  it('sin búsqueda devuelve todas', () => {
    expect(filtrarImportaciones(importaciones, '').map((i) => i.id)).toEqual(['1', '2']);
  });

  it('filtra por nombre de archivo, sin distinguir mayúsculas', () => {
    expect(filtrarImportaciones(importaciones, 'JULIO').map((i) => i.id)).toEqual(['1']);
  });

  it('filtra por nombre de mes o año del período', () => {
    expect(filtrarImportaciones(importaciones, 'agosto').map((i) => i.id)).toEqual(['2']);
    expect(filtrarImportaciones(importaciones, '2026').map((i) => i.id)).toEqual(['1', '2']);
  });

  it('no devuelve nada si la búsqueda no matchea ningún campo', () => {
    expect(filtrarImportaciones(importaciones, 'inexistente')).toEqual([]);
  });
});
