import { describe, expect, it } from 'vitest';
import { nombreArchivoRecibo } from '../../src/modules/emision/domain/nombre-archivo-recibo';
import { Recibo } from '../../src/modules/emision/domain/recibo.entity';
import { ReciboSnapshot } from '../../src/modules/emision/domain/recibo-snapshot';

function snapshot(apellido: string, nombre: string, anio: number, mes: number): ReciboSnapshot {
  return {
    empresa: { razonSocial: 'Acme SA', cuit: '20-12345678-6', domicilio: null, localidad: null, provincia: null, codigoPostal: null },
    empleado: { nombre, apellido, cuil: '27-30987654-2', categoria: null, fechaIngreso: null, antiguedad: '—', legajo: null, banco: null },
    periodo: { anio, mes, fechaPago: '2026-06-05', lugarPago: 'CABA', fechaPagoCargasSociales: '2026-06-10', lugarPagoCargasSociales: 'CABA' },
    conceptos: [],
    totales: { totalBruto: 0, totalDeducciones: 0, totalContribucionesPatronales: 0, neto: 0, costoLaboralTotal: 0 },
    segmentosCostoLaboral: [],
    detalleComposicionSalarial: [],
  };
}

function recibo(apellido: string, nombre: string, anio: number, mes: number): Recibo {
  return Recibo.create({
    id: 'r1',
    importacionId: 'i1',
    empleadoId: 'e1',
    numero: 1,
    snapshot: snapshot(apellido, nombre, anio, mes),
    pdfPath: 'x.pdf',
    hashIntegridad: 'hash',
    fechaEmision: new Date('2026-06-01'),
  });
}

describe('nombreArchivoRecibo', () => {
  it('arma el nombre con el formato exacto pedido', () => {
    expect(nombreArchivoRecibo(recibo('Pérez', 'Juan', 2026, 6))).toBe('Recibo - Pérez Juan - Junio 2026.pdf');
  });

  it('usa el nombre del mes correcto para cada período', () => {
    expect(nombreArchivoRecibo(recibo('Gómez', 'Ana', 2026, 7))).toBe('Recibo - Gómez Ana - Julio 2026.pdf');
    expect(nombreArchivoRecibo(recibo('Rodríguez', 'Carlos', 2026, 8))).toBe('Recibo - Rodríguez Carlos - Agosto 2026.pdf');
  });

  it('quita caracteres inválidos para un nombre de archivo, sin tocar espacios ni tildes', () => {
    const nombre = nombreArchivoRecibo(recibo('Pérez/Gómez', 'Juan:Carlos', 2026, 6));
    expect(nombre).not.toContain('/');
    expect(nombre).not.toContain(':');
    expect(nombre).toContain('é');
    expect(nombre).toContain(' ');
  });

  it('es consistente: mismo criterio para cualquier empleado o período', () => {
    const n1 = nombreArchivoRecibo(recibo('Pérez', 'Juan', 2026, 6));
    const n2 = nombreArchivoRecibo(recibo('Gómez', 'Ana', 2026, 7));
    expect(n1.startsWith('Recibo - ')).toBe(true);
    expect(n2.startsWith('Recibo - ')).toBe(true);
    expect(n1.endsWith('.pdf')).toBe(true);
    expect(n2.endsWith('.pdf')).toBe(true);
  });
});
