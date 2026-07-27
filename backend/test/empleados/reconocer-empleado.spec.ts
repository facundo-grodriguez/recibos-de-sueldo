import { describe, expect, it } from 'vitest';
import {
  indexarEmpleadosConocidos,
  reconocerEmpleado,
  type EmpleadoConocido,
  type IdentidadEmpleado,
} from '../../src/modules/empleados/domain/reconocer-empleado';

function identidad(overrides: Partial<IdentidadEmpleado> = {}): IdentidadEmpleado {
  return { cuil: '20300000003', nombre: 'Marcelo', apellido: 'Ibáñez', ...overrides };
}

const conocidos: EmpleadoConocido[] = [
  { cuil: '20300000003', nombre: 'Marcelo', apellido: 'Ibáñez', estado: 'activo' },
];
const indice = indexarEmpleadosConocidos(conocidos);

describe('reconocerEmpleado', () => {
  it('completa nombre y apellido faltantes desde el empleado ya registrado', () => {
    const resultado = reconocerEmpleado(identidad({ nombre: '', apellido: '' }), indice);

    expect(resultado.identidad).toMatchObject({ cuil: '20300000003', nombre: 'Marcelo', apellido: 'Ibáñez' });
    expect(resultado.correcciones).toEqual(['Nombre y apellido completados desde el empleado ya registrado']);
  });

  it('completa solo el campo que falta, en singular', () => {
    const resultado = reconocerEmpleado(identidad({ nombre: '' }), indice);

    expect(resultado.identidad.nombre).toBe('Marcelo');
    expect(resultado.correcciones).toEqual(['Nombre completado desde el empleado ya registrado']);
  });

  it('reconoce por CUIL aunque el origen lo traiga con guiones', () => {
    const resultado = reconocerEmpleado(identidad({ cuil: '20-30000000-3', nombre: '', apellido: '' }), indice);

    expect(resultado.identidad.nombre).toBe('Marcelo');
  });

  it('no toca un nombre/apellido que sí vino del origen si coincide (ni siquiera por mayúsculas)', () => {
    const resultado = reconocerEmpleado(identidad({ nombre: 'marcelo', apellido: 'IBÁÑEZ' }), indice);

    expect(resultado.identidad).toMatchObject({ nombre: 'marcelo', apellido: 'IBÁÑEZ' });
    expect(resultado.correcciones).toEqual([]);
  });

  it('avisa —sin cambiar el dato del origen— si el nombre difiere del registrado (ADR-071)', () => {
    const resultado = reconocerEmpleado(identidad({ nombre: 'Marcos' }), indice);

    expect(resultado.identidad.nombre).toBe('Marcos'); // se mantiene el del origen
    expect(resultado.correcciones).toEqual([
      'El nombre del archivo ("Marcos") difiere del registrado ("Marcelo"); se mantiene el del archivo',
    ]);
  });

  it('devuelve la identidad intacta y sin correcciones si el empleado no existe (alta nueva)', () => {
    const resultado = reconocerEmpleado(identidad({ cuil: '27300000008', nombre: 'Lucía', apellido: 'Fernández' }), indice);

    expect(resultado.identidad).toMatchObject({ nombre: 'Lucía', apellido: 'Fernández' });
    expect(resultado.correcciones).toEqual([]);
  });

  it('no reconoce nada si la identidad no trae CUIL utilizable', () => {
    const resultado = reconocerEmpleado(identidad({ cuil: '', nombre: '', apellido: '' }), indice);

    expect(resultado.identidad).toMatchObject({ cuil: '', nombre: '', apellido: '' });
    expect(resultado.correcciones).toEqual([]);
  });

  it('avisa si el CUIL reconocido corresponde a un empleado inactivo, sin reactivarlo solo (ADR-079)', () => {
    const indiceConInactivo = indexarEmpleadosConocidos([
      { cuil: '27300000008', nombre: 'Lucía', apellido: 'Fernández', estado: 'inactivo' },
    ]);

    const resultado = reconocerEmpleado(
      identidad({ cuil: '27300000008', nombre: 'Lucía', apellido: 'Fernández' }),
      indiceConInactivo,
    );

    expect(resultado.correcciones).toContain(
      'Lucía Fernández (este CUIL) es un empleado inactivo — no se reactiva solo, revisar antes de emitir',
    );
  });
});
