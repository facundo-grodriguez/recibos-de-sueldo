import { describe, expect, it } from 'vitest';
import { construirDetalleComposicionSalarial } from '../../src/modules/emision/domain/construir-detalle-composicion-salarial';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';

function fila(props: {
  id: string;
  tipo: 'remunerativo' | 'no_remunerativo' | 'deduccion' | 'contribucion_patronal';
  categoriaContribucion?: string | null;
  monto: number;
  valida?: boolean;
}): ImportacionFila {
  return ImportacionFila.create({
    id: props.id,
    numeroFila: 2,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Concepto de prueba',
    montoOriginal: String(props.monto),
    monto: props.valida === false ? null : props.monto,
    valida: props.valida ?? true,
    errorMensaje: props.valida === false ? 'error' : null,
    clasificacion:
      props.tipo === 'remunerativo' || props.tipo === 'no_remunerativo'
        ? ClasificacionConcepto.create(props.tipo, null)
        : ClasificacionConcepto.create(props.tipo, props.categoriaContribucion ?? null),
  });
}

describe('construirDetalleComposicionSalarial', () => {
  it('cruza la contribución patronal y la deducción de la misma categoría en una sola entrada', () => {
    const filas = [
      fila({ id: 'f1', tipo: 'contribucion_patronal', categoriaContribucion: 'seguridad_social', monto: 162000 }),
      fila({ id: 'f2', tipo: 'deduccion', categoriaContribucion: 'seguridad_social', monto: 220000 }),
    ];

    const detalle = construirDetalleComposicionSalarial(filas);

    expect(detalle).toEqual([
      { categoria: 'seguridad_social', etiqueta: 'Seguridad Social', empleador: 162000, trabajador: 220000, total: 382000 },
    ]);
  });

  it('una categoría con solo lado empleador queda con trabajador en 0', () => {
    const filas = [fila({ id: 'f1', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 30000 })];

    const detalle = construirDetalleComposicionSalarial(filas);

    expect(detalle).toEqual([{ categoria: 'art', etiqueta: 'ART', empleador: 30000, trabajador: 0, total: 30000 }]);
  });

  it('una categoría con solo lado trabajador queda con empleador en 0', () => {
    const filas = [fila({ id: 'f1', tipo: 'deduccion', categoriaContribucion: 'sindical', monto: 18000 })];

    const detalle = construirDetalleComposicionSalarial(filas);

    expect(detalle).toEqual([{ categoria: 'sindical', etiqueta: 'Sindical', empleador: 0, trabajador: 18000, total: 18000 }]);
  });

  it('una categoría sin ningún monto no aparece en el resultado', () => {
    const filas = [fila({ id: 'f1', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 30000 })];

    const detalle = construirDetalleComposicionSalarial(filas);

    expect(detalle.find((d) => d.categoria === 'obra_social')).toBeUndefined();
  });

  it('respeta el orden fijo del Anexo III, no el orden de aparición en las filas', () => {
    const filas = [
      fila({ id: 'f1', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 10 }),
      fila({ id: 'f2', tipo: 'contribucion_patronal', categoriaContribucion: 'sindical', monto: 20 }),
    ];

    const detalle = construirDetalleComposicionSalarial(filas);

    expect(detalle.map((d) => d.categoria)).toEqual(['sindical', 'art']);
  });

  it('ignora deducciones sin categoría (no toda deducción encaja en el Anexo III)', () => {
    const filas = [fila({ id: 'f1', tipo: 'deduccion', categoriaContribucion: null, monto: 5000 })];

    expect(construirDetalleComposicionSalarial(filas)).toEqual([]);
  });

  it('ignora conceptos remunerativos y no remunerativos (nunca tienen categoría de contribución)', () => {
    const filas = [
      fila({ id: 'f1', tipo: 'remunerativo', monto: 100000 }),
      fila({ id: 'f2', tipo: 'no_remunerativo', monto: 5000 }),
    ];

    expect(construirDetalleComposicionSalarial(filas)).toEqual([]);
  });

  it('ignora filas inválidas', () => {
    const filas = [
      fila({ id: 'f1', tipo: 'contribucion_patronal', categoriaContribucion: 'art', monto: 100, valida: false }),
    ];

    expect(construirDetalleComposicionSalarial(filas)).toEqual([]);
  });
});
