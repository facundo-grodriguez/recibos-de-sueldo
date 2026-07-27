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
  it('arma un único gajo de Sueldo Neto cuando no hay categorías con ningún aporte', () => {
    const segmentos = construirSegmentosCostoLaboral([], 1000, 1000);

    expect(segmentos).toHaveLength(1);
    expect(segmentos[0]).toMatchObject({ etiqueta: 'Sueldo Neto', monto: 1000, porcentaje: 100 });
  });

  it('no arma el gajo de Sueldo Neto si el neto es 0', () => {
    const detalles = [detalle('sindical', 'Sindical', 100)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 0, 100);

    expect(segmentos.some((s) => s.etiqueta === 'Sueldo Neto')).toBe(false);
  });

  it('respeta el orden fijo del Anexo III y excluye categorías sin ningún aporte patronal (van a "Otros")', () => {
    const detalles = [detalle('art', 'ART', 50), detalle('sindical', 'Sindical', 0, 30)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 1000, 1080);

    expect(segmentos.map((s) => s.etiqueta)).toEqual(['Sueldo Neto', 'ART', 'Otros']);
    expect(segmentos.find((s) => s.etiqueta === 'Otros')?.monto).toBe(30);
  });

  it('calcula el porcentaje siempre sobre el costo laboral total, no sobre el neto solo', () => {
    const detalles = [detalle('obra_social', 'Obra Social', 200)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 800, 1000);

    const neto = segmentos.find((s) => s.etiqueta === 'Sueldo Neto');
    const obraSocial = segmentos.find((s) => s.etiqueta === 'Obra Social');
    expect(neto?.porcentaje).toBe(80);
    expect(obraSocial?.porcentaje).toBe(20);
  });

  it('una categoría con ambos lados se muestra en un único gajo combinado (Empleador+Trabajador)', () => {
    const detalles = [detalle('sindical', 'Sindical', 30, 20)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 950, 1000);

    const sindical = segmentos.find((s) => s.etiqueta === 'Sindical');
    expect(sindical).toMatchObject({ monto: 50 });
  });

  it('una categoría sin aporte patronal (ej. Ganancias) nunca consigue su propio gajo: se redirige a "Otros"', () => {
    // bruto=1000, Ganancias (deducción pura del trabajador)=45 → neto=955;
    // sin contribuciones patronales, costoLaboralTotal sigue siendo el bruto (1000).
    const detalles = [detalle('ganancias', 'Impuesto a las Ganancias', 0, 45)];
    const segmentos = construirSegmentosCostoLaboral(detalles, 955, 1000);

    expect(segmentos.some((s) => s.etiqueta === 'Impuesto a las Ganancias')).toBe(false);
    expect(segmentos.find((s) => s.etiqueta === 'Otros')?.monto).toBe(45);
    expect(segmentos.reduce((acc, s) => acc + s.monto, 0)).toBe(1000);
  });

  it('"Otros" acumula su propio aporte patronal real más lo redirigido de otras categorías sin lado patronal', () => {
    const detalles = [
      detalle('otros', 'Otros', 15, 5),
      detalle('ganancias', 'Impuesto a las Ganancias', 0, 45),
    ];
    const segmentos = construirSegmentosCostoLaboral(detalles, 1000, 1020);

    expect(segmentos.filter((s) => s.etiqueta === 'Otros')).toHaveLength(1);
    expect(segmentos.find((s) => s.etiqueta === 'Otros')?.monto).toBe(65); // 15+5 (propio) + 45 (redirigido)
  });

  it('la suma de todos los gajos cierra exactamente el costo laboral total', () => {
    const detalles = [
      detalle('sindical', 'Sindical', 0, 20),
      detalle('seguridad_social', 'Seguridad Social', 150, 100),
      detalle('art', 'ART', 40),
      detalle('ganancias', 'Impuesto a las Ganancias', 0, 45),
    ];
    // neto = bruto - (20 + 100 + 45) = bruto - 165; acá bruto=1000 → neto=835
    // costoLaboralTotal = bruto + contribuciones patronales = 1000 + 150 + 40 = 1190
    const segmentos = construirSegmentosCostoLaboral(detalles, 835, 1190);

    expect(segmentos.reduce((acc, s) => acc + s.monto, 0)).toBe(1190);
    expect(segmentos.reduce((acc, s) => acc + s.porcentaje, 0)).toBeCloseTo(100, 9);
  });

  it('no rompe por división por cero cuando el costo laboral total es 0', () => {
    const segmentos = construirSegmentosCostoLaboral([], 0, 0);
    expect(segmentos).toHaveLength(0);
  });
});
