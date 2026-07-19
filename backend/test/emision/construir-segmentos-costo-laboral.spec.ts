import { describe, expect, it } from 'vitest';
import { construirSegmentosCostoLaboral } from '../../src/modules/emision/domain/construir-segmentos-costo-laboral';
import { CategoriaContribucion } from '../../src/shared/value-objects/clasificacion-concepto';
import { ReciboSnapshotDetalleCategoria } from '../../src/modules/emision/domain/recibo-snapshot';

function detalle(categoria: CategoriaContribucion, etiqueta: string, total: number): ReciboSnapshotDetalleCategoria {
  return { categoria, etiqueta, empleador: total, trabajador: 0, total };
}

describe('construirSegmentosCostoLaboral', () => {
  it('arma un único gajo de Sueldo Neto cuando no hay categorías con monto', () => {
    const segmentos = construirSegmentosCostoLaboral([], 1000, 1000);

    expect(segmentos).toHaveLength(1);
    expect(segmentos[0]).toMatchObject({ etiqueta: 'Sueldo Neto', monto: 1000, porcentaje: 100 });
  });

  it('no arma el gajo de Sueldo Neto si el neto es 0', () => {
    const detalles = [detalle('sindical', 'Sindical', 100)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 0, 100);

    expect(segmentos.some((s) => s.etiqueta === 'Sueldo Neto')).toBe(false);
  });

  it('respeta el orden fijo del Anexo III y excluye categorías en 0', () => {
    const detalles = [detalle('art', 'ART', 50), detalle('sindical', 'Sindical', 30)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 1000, 1080);

    expect(segmentos.map((s) => s.etiqueta)).toEqual(['Sueldo Neto', 'Sindical', 'ART']);
  });

  it('calcula el porcentaje siempre sobre el costo laboral total, no sobre el neto', () => {
    const detalles = [detalle('obra_social', 'Obra Social', 200)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 800, 1000);

    const neto = segmentos.find((s) => s.etiqueta === 'Sueldo Neto');
    const obraSocial = segmentos.find((s) => s.etiqueta === 'Obra Social');
    expect(neto?.porcentaje).toBe(80);
    expect(obraSocial?.porcentaje).toBe(20);
  });

  it('usa el costo COMBINADO Empleador+Trabajador de cada categoría, no solo la contribución patronal', () => {
    const detalles = [{ categoria: 'sindical' as CategoriaContribucion, etiqueta: 'Sindical', empleador: 30, trabajador: 20, total: 50 }];
    const segmentos = construirSegmentosCostoLaboral(detalles, 0, 50);

    expect(segmentos).toHaveLength(1);
    expect(segmentos[0]).toMatchObject({ etiqueta: 'Sindical', monto: 50 });
  });

  it('no rompe por división por cero cuando el costo laboral total es 0', () => {
    const segmentos = construirSegmentosCostoLaboral([], 0, 0);
    expect(segmentos).toHaveLength(0);
  });
});
