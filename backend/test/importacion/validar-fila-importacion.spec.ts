import { describe, expect, it } from 'vitest';
import { FilaCanonica } from '../../src/modules/importacion/domain/fila-canonica';
import { validarFilaImportacion } from '../../src/modules/importacion/domain/validar-fila-importacion';

function filaBase(overrides: Partial<FilaCanonica> = {}): FilaCanonica {
  return {
    numeroFila: 2,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Sueldo básico',
    monto: '1500.50',
    ...overrides,
  };
}

describe('validarFilaImportacion', () => {
  it('acepta una fila completa y válida', () => {
    const resultado = validarFilaImportacion(filaBase());

    expect(resultado.valida).toBe(true);
    if (resultado.valida) {
      expect(resultado.datos.cuil.value).toBe('27309876542');
      expect(resultado.datos.nombre).toBe('Juan');
      expect(resultado.datos.monto.toDecimal()).toBe(1500.5);
    }
  });

  it('acepta monto con coma decimal (formato argentino)', () => {
    const resultado = validarFilaImportacion(filaBase({ monto: '1500,50' }));

    expect(resultado.valida).toBe(true);
    if (resultado.valida) {
      expect(resultado.datos.monto.toDecimal()).toBe(1500.5);
    }
  });

  it('rechaza un CUIL con dígito verificador incorrecto', () => {
    const resultado = validarFilaImportacion(filaBase({ cuil: '27309876540' }));

    expect(resultado.valida).toBe(false);
    if (!resultado.valida) {
      expect(resultado.error).toMatch(/CUIL inválido/);
    }
  });

  it('rechaza un monto no numérico', () => {
    const resultado = validarFilaImportacion(filaBase({ monto: 'no-es-un-numero' }));

    expect(resultado.valida).toBe(false);
    if (!resultado.valida) {
      expect(resultado.error).toMatch(/Monto inválido/);
    }
  });

  it('acepta un monto en cero o negativo (hay conceptos reales así: un encabezado de sección liquidado en $0, o un par que se cancela entre sí)', () => {
    const resultadoCero = validarFilaImportacion(filaBase({ monto: '0' }));
    expect(resultadoCero.valida).toBe(true);
    if (resultadoCero.valida) {
      expect(resultadoCero.datos.monto.toDecimal()).toBe(0);
    }

    const resultadoNegativo = validarFilaImportacion(filaBase({ monto: '-100' }));
    expect(resultadoNegativo.valida).toBe(true);
    if (resultadoNegativo.valida) {
      expect(resultadoNegativo.datos.monto.toDecimal()).toBe(-100);
    }
  });

  it('rechaza nombre, apellido o concepto vacíos', () => {
    expect(validarFilaImportacion(filaBase({ nombre: '  ' })).valida).toBe(false);
    expect(validarFilaImportacion(filaBase({ apellido: '' })).valida).toBe(false);
    expect(validarFilaImportacion(filaBase({ concepto: '' })).valida).toBe(false);
  });

  it('acumula todos los errores de la fila en un solo mensaje', () => {
    const resultado = validarFilaImportacion(
      filaBase({ nombre: '', cuil: 'invalido', monto: 'x' }),
    );

    expect(resultado.valida).toBe(false);
    if (!resultado.valida) {
      expect(resultado.error).toMatch(/nombre/);
      expect(resultado.error).toMatch(/CUIL/);
      expect(resultado.error).toMatch(/Monto/);
    }
  });

  it('parsea unidad y base cuando vienen en el archivo', () => {
    const resultado = validarFilaImportacion(filaBase({ unidad: '30', base: '1125631' }));

    expect(resultado.valida).toBe(true);
    if (resultado.valida) {
      expect(resultado.datos.unidad).toBe('30');
      expect(resultado.datos.base).toBe(1125631);
    }
  });

  it('deja unidad y base en null cuando el archivo no las trae, sin invalidar la fila', () => {
    const resultado = validarFilaImportacion(filaBase());

    expect(resultado.valida).toBe(true);
    if (resultado.valida) {
      expect(resultado.datos.unidad).toBeNull();
      expect(resultado.datos.base).toBeNull();
    }
  });

  it('una base con texto no numérico queda en null sin invalidar la fila (es solo informativa)', () => {
    const resultado = validarFilaImportacion(filaBase({ base: 'no-es-un-numero' }));

    expect(resultado.valida).toBe(true);
    if (resultado.valida) {
      expect(resultado.datos.base).toBeNull();
    }
  });

  it('acepta unidad con formato de porcentaje tal cual viene, sin interpretarla', () => {
    const resultado = validarFilaImportacion(filaBase({ unidad: '11%' }));

    expect(resultado.valida).toBe(true);
    if (resultado.valida) {
      expect(resultado.datos.unidad).toBe('11%');
    }
  });

  describe('correcciones (Fase 6): informar normalizaciones de formato sin bloquear la fila', () => {
    it('no reporta ninguna corrección si la fila ya viene limpia', () => {
      const resultado = validarFilaImportacion(filaBase());

      expect(resultado.valida).toBe(true);
      if (resultado.valida) {
        expect(resultado.datos.correcciones).toEqual([]);
      }
    });

    it('informa que se quitaron guiones/puntos del CUIL', () => {
      const resultado = validarFilaImportacion(filaBase({ cuil: '27-30987654-2' }));

      expect(resultado.valida).toBe(true);
      if (resultado.valida) {
        expect(resultado.datos.correcciones.some((c) => c.startsWith('CUIL'))).toBe(true);
      }
    });

    it('informa que la coma del monto se interpretó como separador decimal', () => {
      const resultado = validarFilaImportacion(filaBase({ monto: '1500,50' }));

      expect(resultado.valida).toBe(true);
      if (resultado.valida) {
        expect(resultado.datos.correcciones.some((c) => c.startsWith('Monto'))).toBe(true);
      }
    });

    it('informa que se recortaron espacios de más en nombre/apellido/concepto', () => {
      const resultado = validarFilaImportacion(
        filaBase({ nombre: '  Juan  ', apellido: ' Perez', concepto: 'Sueldo básico ' }),
      );

      expect(resultado.valida).toBe(true);
      if (resultado.valida) {
        expect(resultado.datos.correcciones).toEqual(
          expect.arrayContaining([
            expect.stringContaining('Nombre'),
            expect.stringContaining('Apellido'),
            expect.stringContaining('Concepto'),
          ]),
        );
      }
    });

    it('nunca reporta una corrección de mayúsculas/minúsculas (solo formato, nunca contenido)', () => {
      const resultado = validarFilaImportacion(filaBase({ concepto: 'SUELDO BÁSICO' }));

      expect(resultado.valida).toBe(true);
      if (resultado.valida) {
        expect(resultado.datos.concepto).toBe('SUELDO BÁSICO');
        expect(resultado.datos.correcciones).toEqual([]);
      }
    });

    describe('identidadHeredada (ADR-072, opción B): no repetir el aviso de CUIL/nombre/apellido por fila', () => {
      it('no reporta corrección de CUIL/nombre/apellido en una fila con identidad heredada, aunque el valor heredado tuviera formato sucio', () => {
        const resultado = validarFilaImportacion(
          filaBase({ cuil: '27-30987654-2', nombre: '  Juan  ', apellido: ' Perez', identidadHeredada: true }),
        );

        expect(resultado.valida).toBe(true);
        if (resultado.valida) {
          expect(resultado.datos.correcciones).toEqual([]);
        }
      });

      it('sigue reportando correcciones de concepto y monto en una fila con identidad heredada (son genuinamente por línea)', () => {
        const resultado = validarFilaImportacion(
          filaBase({ identidadHeredada: true, concepto: 'Antigüedad ', monto: '300,00' }),
        );

        expect(resultado.valida).toBe(true);
        if (resultado.valida) {
          expect(resultado.datos.correcciones).toEqual(
            expect.arrayContaining([expect.stringContaining('Concepto'), expect.stringContaining('Monto')]),
          );
        }
      });

      it('un CUIL heredado igual sigue validándose (inválido → bloquea la fila igual que antes)', () => {
        const resultado = validarFilaImportacion(filaBase({ cuil: '27309876540', identidadHeredada: true }));

        expect(resultado.valida).toBe(false);
        if (!resultado.valida) {
          expect(resultado.error).toMatch(/CUIL inválido/);
        }
      });
    });
  });
});
