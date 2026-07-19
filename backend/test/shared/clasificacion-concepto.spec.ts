import { describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';

describe('ClasificacionConcepto', () => {
  it('acepta un tipo remunerativo sin categoría de contribución', () => {
    const clasificacion = ClasificacionConcepto.create('remunerativo', null);
    expect(clasificacion.tipo).toBe('remunerativo');
    expect(clasificacion.categoriaContribucion).toBeNull();
  });

  it('acepta contribucion_patronal con una categoría válida', () => {
    const clasificacion = ClasificacionConcepto.create('contribucion_patronal', 'obra_social');
    expect(clasificacion.categoriaContribucion).toBe('obra_social');
  });

  it('rechaza un tipo inválido', () => {
    expect(() => ClasificacionConcepto.create('inventado', null)).toThrow(DomainError);
  });

  it('rechaza contribucion_patronal sin categoría', () => {
    expect(() => ClasificacionConcepto.create('contribucion_patronal', null)).toThrow(DomainError);
  });

  it('rechaza contribucion_patronal con una categoría inválida', () => {
    expect(() => ClasificacionConcepto.create('contribucion_patronal', 'inventada')).toThrow(DomainError);
  });

  it('rechaza una categoría de contribución en remunerativo/no_remunerativo', () => {
    expect(() => ClasificacionConcepto.create('remunerativo', 'obra_social')).toThrow(DomainError);
    expect(() => ClasificacionConcepto.create('no_remunerativo', 'art')).toThrow(DomainError);
  });

  it('acepta una deducción con categoría opcional, para cruzarla con la contribución patronal equivalente', () => {
    const clasificacion = ClasificacionConcepto.create('deduccion', 'sindical');
    expect(clasificacion.tipo).toBe('deduccion');
    expect(clasificacion.categoriaContribucion).toBe('sindical');
  });

  it('acepta una deducción sin categoría (no toda deducción encaja en una categoría del Anexo III)', () => {
    const clasificacion = ClasificacionConcepto.create('deduccion', null);
    expect(clasificacion.categoriaContribucion).toBeNull();
  });

  it('rechaza una deducción con una categoría inválida', () => {
    expect(() => ClasificacionConcepto.create('deduccion', 'inventada')).toThrow(DomainError);
  });

  it('equals compara tipo y categoría', () => {
    const a = ClasificacionConcepto.create('contribucion_patronal', 'art');
    const b = ClasificacionConcepto.create('contribucion_patronal', 'art');
    const c = ClasificacionConcepto.create('contribucion_patronal', 'sindical');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
