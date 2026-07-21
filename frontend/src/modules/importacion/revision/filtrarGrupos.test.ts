import { describe, expect, it } from 'vitest';
import type { ImportacionFila } from '../api';
import { agruparFilasPorEmpleado } from './agruparFilasPorEmpleado';
import { filtrarGrupos } from './filtrarGrupos';

function fila(overrides: Partial<ImportacionFila> = {}): ImportacionFila {
  return {
    id: 'fila-1',
    numeroFila: 2,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Sueldo básico',
    montoOriginal: '1500',
    monto: 1500,
    valida: true,
    errorMensaje: null,
    tipo: 'remunerativo',
    categoriaContribucion: null,
    unidad: null,
    base: null,
    correcciones: [],
    ...overrides,
  };
}

const grupos = agruparFilasPorEmpleado([
  fila({ id: '1', cuil: '27309876542', nombre: 'Juan', apellido: 'Perez', concepto: 'Sueldo básico' }),
  fila({ id: '2', cuil: '27309876542', nombre: 'Juan', apellido: 'Perez', concepto: 'Presentismo' }),
  fila({ id: '3', cuil: '20111111112', nombre: 'Ana', apellido: 'Gomez', concepto: 'Sueldo básico', valida: false, errorMensaje: 'monto inválido' }),
  fila({ id: '4', cuil: '30222222223', nombre: 'Carlos', apellido: 'Diaz', concepto: 'Antigüedad', tipo: null }),
]);

describe('filtrarGrupos — búsqueda', () => {
  it('sin texto, no filtra nada', () => {
    expect(filtrarGrupos(grupos, { busqueda: '', filtro: 'todos' })).toHaveLength(3);
  });

  it('encuentra por nombre, apellido o CUIL, sin distinguir mayúsculas', () => {
    expect(filtrarGrupos(grupos, { busqueda: 'PEREZ', filtro: 'todos' }).map((g) => g.cuil)).toEqual(['27309876542']);
    expect(filtrarGrupos(grupos, { busqueda: 'ana', filtro: 'todos' }).map((g) => g.cuil)).toEqual(['20111111112']);
    expect(filtrarGrupos(grupos, { busqueda: '30222222223', filtro: 'todos' }).map((g) => g.cuil)).toEqual([
      '30222222223',
    ]);
  });

  it('encuentra por concepto de cualquiera de sus filas (detección de errores masivos)', () => {
    const resultado = filtrarGrupos(grupos, { busqueda: 'presentismo', filtro: 'todos' });
    expect(resultado.map((g) => g.cuil)).toEqual(['27309876542']);
  });
});

describe('filtrarGrupos — filtro de estado (por empleado, no por fila)', () => {
  it('"error" muestra el grupo completo si al menos una fila tiene error', () => {
    const resultado = filtrarGrupos(grupos, { busqueda: '', filtro: 'error' });
    expect(resultado.map((g) => g.cuil)).toEqual(['20111111112']);
    // el grupo completo queda visible, no solo la fila con error
    expect(resultado[0].filas).toHaveLength(1);
  });

  it('"sinClasificar" filtra por fila válida con tipo null', () => {
    const resultado = filtrarGrupos(grupos, { busqueda: '', filtro: 'sinClasificar' });
    expect(resultado.map((g) => g.cuil)).toEqual(['30222222223']);
  });

  it('"advertencia" filtra por filas con correcciones automáticas', () => {
    const conCorreccion = agruparFilasPorEmpleado([
      fila({ id: '5', cuil: '20111111112', correcciones: ['CUIL: se normalizó quitando espacios, guiones o puntos'] }),
    ]);
    expect(filtrarGrupos(conCorreccion, { busqueda: '', filtro: 'advertencia' })).toHaveLength(1);
    expect(filtrarGrupos(grupos, { busqueda: '', filtro: 'advertencia' })).toHaveLength(0);
  });
});
