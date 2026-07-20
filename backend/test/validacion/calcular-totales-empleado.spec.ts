import { describe, expect, it } from 'vitest';
import { calcularTotalesEmpleado } from '../../src/modules/validacion/domain/calcular-totales-empleado';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';

let contador = 0;

function filaClasificada(tipo: string, monto: number, categoriaContribucion: string | null = null): ImportacionFila {
  contador += 1;
  return ImportacionFila.create({
    id: `fila-${contador}`,
    numeroFila: contador + 1,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Concepto',
    montoOriginal: String(monto),
    monto,
    valida: true,
    errorMensaje: null,
    clasificacion: ClasificacionConcepto.create(tipo, categoriaContribucion),
  });
}

function filaSinClasificar(monto: number): ImportacionFila {
  contador += 1;
  return ImportacionFila.create({
    id: `fila-${contador}`,
    numeroFila: contador + 1,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Concepto nuevo',
    montoOriginal: String(monto),
    monto,
    valida: true,
    errorMensaje: null,
    clasificacion: null,
  });
}

describe('calcularTotalesEmpleado', () => {
  it('suma bruto, deducciones, contribuciones y calcula neto y costo laboral', () => {
    const totales = calcularTotalesEmpleado([
      filaClasificada('remunerativo', 1000),
      filaClasificada('no_remunerativo', 200),
      filaClasificada('deduccion', 300, 'otros'),
      filaClasificada('contribucion_patronal', 150, 'art'),
    ]);

    expect(totales.totalBruto).toBe(1200);
    expect(totales.totalDeducciones).toBe(300);
    expect(totales.totalContribucionesPatronales).toBe(150);
    expect(totales.neto).toBe(900);
    expect(totales.costoLaboralTotal).toBe(1350);
  });

  it('rechaza en runtime un tipo no contemplado (guarda de exhaustividad, ver clasificacion-concepto.ts)', () => {
    // `ClasificacionConcepto.create` ya impide esto en código normal (valida
    // contra TIPOS_CONCEPTO) — el cast bypasea esa validación a propósito
    // para simular un tipo nuevo que se haya colado igual (ej. una entidad
    // hidratada por otro camino), y probar que la guarda de `default: never`
    // de calcularTotalesEmpleado también frena en runtime, no solo en
    // compilación.
    contador += 1;
    const filaConTipoFuturo = ImportacionFila.create({
      id: `fila-${contador}`,
      numeroFila: contador + 1,
      cuil: '27309876542',
      nombre: 'Juan',
      apellido: 'Perez',
      concepto: 'Retención judicial',
      montoOriginal: '100',
      monto: 100,
      valida: true,
      errorMensaje: null,
      clasificacion: { tipo: 'retencion_judicial', categoriaContribucion: 'otros' } as unknown as ClasificacionConcepto,
    });

    expect(() => calcularTotalesEmpleado([filaConTipoFuturo])).toThrow(/sin contemplar/);
  });

  it('ignora filas sin clasificar', () => {
    const totales = calcularTotalesEmpleado([filaClasificada('remunerativo', 1000), filaSinClasificar(500)]);

    expect(totales.totalBruto).toBe(1000);
  });

  it('devuelve todo en cero para una lista vacía', () => {
    const totales = calcularTotalesEmpleado([]);

    expect(totales).toEqual({
      totalBruto: 0,
      totalDeducciones: 0,
      totalContribucionesPatronales: 0,
      neto: 0,
      costoLaboralTotal: 0,
    });
  });
});
