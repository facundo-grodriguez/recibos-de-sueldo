import { describe, expect, it } from 'vitest';
import type { ImportacionFila } from '../api';
import { agruparFilasPorEmpleado, resumenGrupo, tituloGrupo } from './agruparFilasPorEmpleado';

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

describe('agruparFilasPorEmpleado', () => {
  it('agrupa las filas del mismo CUIL en un solo grupo', () => {
    const filas = [
      fila({ id: '1', cuil: '27309876542', concepto: 'Sueldo básico' }),
      fila({ id: '2', cuil: '27309876542', concepto: 'Antigüedad' }),
    ];

    const grupos = agruparFilasPorEmpleado(filas);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].filas.map((f) => f.id)).toEqual(['1', '2']);
  });

  it('preserva el orden original del archivo (posición de la primera fila de cada empleado)', () => {
    const filas = [
      fila({ id: '1', cuil: '20111111112', nombre: 'Ana', apellido: 'Gomez' }),
      fila({ id: '2', cuil: '27309876542', nombre: 'Juan', apellido: 'Perez' }),
      fila({ id: '3', cuil: '20111111112', nombre: 'Ana', apellido: 'Gomez' }), // 2ª fila de Ana, ya apareció antes
    ];

    const grupos = agruparFilasPorEmpleado(filas);

    expect(grupos.map((g) => g.cuil)).toEqual(['20111111112', '27309876542']);
    expect(grupos[0].filas.map((f) => f.id)).toEqual(['1', '3']);
  });

  it('junta las filas sin CUIL en un único grupo "sin identificar", en vez de descartarlas', () => {
    const filas = [
      fila({ id: '1', cuil: '', nombre: '', apellido: '', errorMensaje: 'CUIL inválido', valida: false }),
      fila({ id: '2', cuil: '27309876542' }),
      fila({ id: '3', cuil: '', nombre: '', apellido: '', errorMensaje: 'CUIL inválido', valida: false }),
    ];

    const grupos = agruparFilasPorEmpleado(filas);

    const sinIdentificar = grupos.find((g) => g.sinIdentificar);
    expect(sinIdentificar).toBeDefined();
    expect(sinIdentificar?.filas.map((f) => f.id)).toEqual(['1', '3']);
    expect(sinIdentificar?.cuil).toBe('');
  });

  it('no confunde dos empleados distintos que comparten CUIL vacío entre sí (quedan en el mismo bucket, no se pierden)', () => {
    const filas = [fila({ id: '1', cuil: '  ' }), fila({ id: '2', cuil: '' })];

    const grupos = agruparFilasPorEmpleado(filas);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].sinIdentificar).toBe(true);
    expect(grupos[0].filas).toHaveLength(2);
  });
});

describe('resumenGrupo', () => {
  it('cuenta conceptos, válidos, errores y filas con corrección automática', () => {
    const grupo = agruparFilasPorEmpleado([
      fila({ id: '1', valida: true, correcciones: [] }),
      fila({ id: '2', valida: false, errorMensaje: 'monto inválido' }),
      fila({ id: '3', valida: true, correcciones: ['CUIL: se normalizó quitando espacios, guiones o puntos'] }),
    ])[0];

    const resumen = resumenGrupo(grupo);

    expect(resumen).toEqual({
      conceptos: 3,
      validos: 2,
      errores: 1,
      correcciones: 1,
      tieneError: true,
      tieneAdvertencia: true,
    });
  });

  it('un grupo sin errores ni correcciones no marca ningún flag', () => {
    const grupo = agruparFilasPorEmpleado([fila({ id: '1' }), fila({ id: '2' })])[0];

    const resumen = resumenGrupo(grupo);

    expect(resumen.tieneError).toBe(false);
    expect(resumen.tieneAdvertencia).toBe(false);
  });
});

describe('tituloGrupo', () => {
  it('muestra apellido y nombre cuando hay identidad', () => {
    const grupo = agruparFilasPorEmpleado([fila({ nombre: 'Juan', apellido: 'Perez' })])[0];
    expect(tituloGrupo(grupo)).toBe('Perez, Juan');
  });

  it('cae al CUIL cuando la fila tiene CUIL pero no nombre/apellido (el propio error es la identidad)', () => {
    const grupo = agruparFilasPorEmpleado([
      fila({ cuil: '20300000009', nombre: '', apellido: '', valida: false, errorMensaje: 'CUIL inválido' }),
    ])[0];
    expect(tituloGrupo(grupo)).toBe('CUIL 20300000009 (sin nombre)');
  });

  it('usa "Sin identificar" para el grupo sin CUIL, incluso si por alguna razón tuviera nombre', () => {
    const grupo = agruparFilasPorEmpleado([fila({ cuil: '' })])[0];
    expect(tituloGrupo(grupo)).toBe('Sin identificar');
  });
});
