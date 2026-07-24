import { describe, expect, it } from 'vitest';
import { definirConceptoCatalogoSchema } from './schema';

const base = { concepto: 'Concepto de prueba' };

describe('definirConceptoCatalogoSchema', () => {
  it('acepta remunerativo sin categoría', () => {
    const resultado = definirConceptoCatalogoSchema.safeParse({ ...base, tipo: 'remunerativo' });
    expect(resultado.success).toBe(true);
  });

  it('rechaza contribución patronal sin categoría', () => {
    const resultado = definirConceptoCatalogoSchema.safeParse({ ...base, tipo: 'contribucion_patronal' });
    expect(resultado.success).toBe(false);
  });

  it('rechaza deducción sin categoría (ADR-069: toda deducción debe clasificarse)', () => {
    const resultado = definirConceptoCatalogoSchema.safeParse({ ...base, tipo: 'deduccion' });
    expect(resultado.success).toBe(false);
  });

  it('acepta deducción con categoría "otros" como salida residual', () => {
    const resultado = definirConceptoCatalogoSchema.safeParse({ ...base, tipo: 'deduccion', categoriaContribucion: 'otros' });
    expect(resultado.success).toBe(true);
  });

  it('acepta deducción con categoría "ganancias" (Impuesto a las Ganancias)', () => {
    const resultado = definirConceptoCatalogoSchema.safeParse({
      ...base,
      tipo: 'deduccion',
      categoriaContribucion: 'ganancias',
    });
    expect(resultado.success).toBe(true);
  });
});
