import { describe, expect, it } from 'vitest';
import { evaluarReglasEmpleado, FichaEmpleadoValidacion } from '../../src/modules/validacion/domain/evaluar-reglas-empleado';
import { TotalesEmpleado } from '../../src/modules/validacion/domain/resultado-validacion';

function totales(overrides: Partial<TotalesEmpleado> = {}): TotalesEmpleado {
  return {
    totalBruto: 1000,
    totalDeducciones: 200,
    totalContribucionesPatronales: 100,
    neto: 800,
    costoLaboralTotal: 1100,
    ...overrides,
  };
}

/** Ficha completa por defecto: los tests de bruto/neto/variación no quieren ruido de esta regla. */
function ficha(overrides: Partial<FichaEmpleadoValidacion> = {}): FichaEmpleadoValidacion {
  return {
    categoria: 'Administrativo A',
    fechaIngreso: new Date('2020-01-01'),
    ...overrides,
  };
}

describe('evaluarReglasEmpleado', () => {
  it('no reporta nada cuando todo está bien y no hay período anterior', () => {
    const resultado = evaluarReglasEmpleado(totales(), null, ficha());

    expect(resultado.errores).toHaveLength(0);
    expect(resultado.advertencias).toHaveLength(0);
  });

  it('bloquea si no tiene ningún concepto remunerativo', () => {
    const resultado = evaluarReglasEmpleado(totales({ totalBruto: 0, neto: -200 }), null, ficha());

    expect(resultado.errores).toContain('No tiene ningún concepto remunerativo');
  });

  it('bloquea si el neto es negativo', () => {
    const resultado = evaluarReglasEmpleado(totales({ neto: -50 }), null, ficha());

    expect(resultado.errores.some((e) => e.includes('negativo'))).toBe(true);
  });

  it('no advierte si la variación del neto es menor al umbral', () => {
    // 800 vs 750 -> ~6.7% de variación, por debajo del 30%.
    const resultado = evaluarReglasEmpleado(totales({ neto: 800 }), 750, ficha());

    expect(resultado.advertencias).toHaveLength(0);
  });

  it('advierte si la variación del neto supera el umbral', () => {
    // 800 vs 400 -> 100% de variación.
    const resultado = evaluarReglasEmpleado(totales({ neto: 800 }), 400, ficha());

    expect(resultado.advertencias).toHaveLength(1);
    expect(resultado.advertencias[0]).toMatch(/varió/);
  });

  it('no divide por cero si el neto anterior era 0', () => {
    expect(() => evaluarReglasEmpleado(totales({ neto: 800 }), 0, ficha())).not.toThrow();
    expect(evaluarReglasEmpleado(totales({ neto: 800 }), 0, ficha()).advertencias).toHaveLength(0);
  });

  it('bloquea si falta la categoría laboral', () => {
    const resultado = evaluarReglasEmpleado(totales(), null, ficha({ categoria: null }));

    expect(resultado.errores).toContain('Falta la categoría laboral en la ficha del empleado');
  });

  it('bloquea si falta la fecha de ingreso', () => {
    const resultado = evaluarReglasEmpleado(totales(), null, ficha({ fechaIngreso: null }));

    expect(resultado.errores).toContain('Falta la fecha de ingreso en la ficha del empleado');
  });

  it('no valida la ficha cuando es null (empleado inactivo, no corresponde bloquear)', () => {
    const resultado = evaluarReglasEmpleado(totales(), null, null);

    expect(resultado.errores).toHaveLength(0);
  });
});
