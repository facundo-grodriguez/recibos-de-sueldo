import { describe, expect, it } from 'vitest';
import type { Empleado } from './api';
import { filtrarEmpleados } from './filtrarEmpleados';

function empleado(overrides: Partial<Empleado> = {}): Empleado {
  return {
    id: '1',
    nombre: 'Juan',
    apellido: 'Perez',
    cuil: '27309876542',
    estado: 'activo',
    categoria: null,
    fechaIngreso: null,
    legajo: null,
    banco: null,
    ...overrides,
  };
}

describe('filtrarEmpleados', () => {
  const empleados = [
    empleado({ id: '1', nombre: 'Juan', apellido: 'Perez', cuil: '27309876542', estado: 'activo' }),
    empleado({ id: '2', nombre: 'Ana', apellido: 'Gomez', cuil: '20987654326', estado: 'inactivo' }),
  ];

  it('oculta los inactivos por defecto', () => {
    const resultado = filtrarEmpleados(empleados, { busqueda: '', mostrarInactivos: false });
    expect(resultado.map((e) => e.id)).toEqual(['1']);
  });

  it('muestra los inactivos cuando se pide explícitamente', () => {
    const resultado = filtrarEmpleados(empleados, { busqueda: '', mostrarInactivos: true });
    expect(resultado.map((e) => e.id).sort()).toEqual(['1', '2']);
  });

  it('filtra por nombre, apellido o CUIL, sin distinguir mayúsculas', () => {
    expect(filtrarEmpleados(empleados, { busqueda: 'juan', mostrarInactivos: false }).map((e) => e.id)).toEqual(['1']);
    expect(filtrarEmpleados(empleados, { busqueda: 'GOMEZ', mostrarInactivos: true }).map((e) => e.id)).toEqual(['2']);
    expect(filtrarEmpleados(empleados, { busqueda: '20987654326', mostrarInactivos: true }).map((e) => e.id)).toEqual([
      '2',
    ]);
  });

  it('no devuelve nada si la búsqueda no matchea ningún campo', () => {
    const resultado = filtrarEmpleados(empleados, { busqueda: 'inexistente', mostrarInactivos: true });
    expect(resultado).toEqual([]);
  });
});
