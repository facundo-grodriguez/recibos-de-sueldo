import { describe, expect, it } from 'vitest';
import { construirSegmentosCostoLaboral } from '../../src/modules/emision/domain/construir-segmentos-costo-laboral';
import { CategoriaContribucion } from '../../src/shared/value-objects/clasificacion-concepto';
import { ReciboSnapshotDetalleCategoria } from '../../src/modules/emision/domain/recibo-snapshot';

function detalle(
  categoria: CategoriaContribucion,
  etiqueta: string,
  empleador: number,
  trabajador = 0,
): ReciboSnapshotDetalleCategoria {
  return { categoria, etiqueta, empleador, trabajador, total: empleador + trabajador };
}

describe('construirSegmentosCostoLaboral', () => {
  it('arma un único gajo de Sueldo Bruto cuando no hay categorías con aporte patronal', () => {
    const segmentos = construirSegmentosCostoLaboral([], 1000, 1000);

    expect(segmentos).toHaveLength(1);
    expect(segmentos[0]).toMatchObject({ etiqueta: 'Sueldo Bruto', monto: 1000, porcentaje: 100 });
  });

  it('no arma el gajo de Sueldo Bruto si el bruto es 0', () => {
    const detalles = [detalle('sindical', 'Sindical', 100)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 0, 100);

    expect(segmentos.some((s) => s.etiqueta === 'Sueldo Bruto')).toBe(false);
  });

  it('respeta el orden fijo del Anexo III y excluye categorías sin aporte patronal', () => {
    const detalles = [detalle('art', 'ART', 50), detalle('sindical', 'Sindical', 30)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 1000, 1080);

    expect(segmentos.map((s) => s.etiqueta)).toEqual(['Sueldo Bruto', 'Sindical', 'ART']);
  });

  it('calcula el porcentaje siempre sobre el costo laboral total, no sobre el bruto', () => {
    const detalles = [detalle('obra_social', 'Obra Social', 200)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 800, 1000);

    const bruto = segmentos.find((s) => s.etiqueta === 'Sueldo Bruto');
    const obraSocial = segmentos.find((s) => s.etiqueta === 'Obra Social');
    expect(bruto?.porcentaje).toBe(80);
    expect(obraSocial?.porcentaje).toBe(20);
  });

  it('usa solo la contribución patronal cruda de cada categoría, nunca combinada con la deducción del trabajador', () => {
    const detalles = [detalle('sindical', 'Sindical', 30, 20)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 950, 1000);

    const sindical = segmentos.find((s) => s.etiqueta === 'Sindical');
    expect(sindical).toMatchObject({ monto: 30 });
  });

  it('no genera gajo para una categoría sin aporte patronal (ej. Ganancias, deducción pura del trabajador)', () => {
    // Ganancias se resta del bruto para llegar al neto, nunca suma al costo
    // laboral total — por eso el bruto (1000) ya incluye esos $45 retenidos,
    // y sin contribuciones patronales el costo laboral total también es 1000.
    const detalles = [detalle('ganancias', 'Impuesto a las Ganancias', 0, 45)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 1000, 1000);

    expect(segmentos.some((s) => s.etiqueta === 'Impuesto a las Ganancias')).toBe(false);
    expect(segmentos.reduce((acc, s) => acc + s.monto, 0)).toBe(1000);
  });

  it('no rompe por división por cero cuando el costo laboral total es 0', () => {
    const segmentos = construirSegmentosCostoLaboral([], 0, 0);
    expect(segmentos).toHaveLength(0);
  });
});
