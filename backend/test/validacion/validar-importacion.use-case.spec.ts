import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
import { ValidarImportacionUseCase } from '../../src/modules/validacion/application/validar-importacion.use-case';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';
const CUIL_A = '27309876542';
const CUIL_B = '20123456786';

class EmpresaRepositoryFake implements EmpresaRepository {
  visible = true;

  async create(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }

  async findAllByUsuario(): Promise<Empresa[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndUsuario(id: string, usuarioId: string): Promise<Empresa | null> {
    if (!this.visible || id !== EMPRESA_ID || usuarioId !== USUARIO_ID) return null;
    return Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
    });
  }

  async actualizar(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  importaciones: Importacion[] = [];

  async create(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Importacion | null> {
    return this.importaciones.find((i) => i.id === id && i.empresaId === empresaId) ?? null;
  }

  async findAllByEmpresa(): Promise<Importacion[]> {
    throw new Error('no usado en este test');
  }

  async marcarConfirmada(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async actualizarFila(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async aplicarClasificacion(): Promise<number> {
    throw new Error('no usado en este test');
  }

  async listarConceptosPendientes(): Promise<string[]> {
    throw new Error('no usado en este test');
  }

  async agruparFilasSinClasificarPorConcepto(): Promise<Map<string, string[]>> {
    throw new Error('no usado en este test');
  }

  async actualizarClasificacionPorIds(): Promise<number> {
    throw new Error('no usado en este test');
  }

  async findConfirmadasAnteriores(empresaId: string, anio: number, mes: number): Promise<Importacion[]> {
    return this.importaciones
      .filter(
        (i) =>
          i.empresaId === empresaId &&
          i.estado === 'confirmada' &&
          (i.anio < anio || (i.anio === anio && i.mes < mes)),
      )
      .sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  }

  async existeOtraEnMismoPeriodo(): Promise<boolean> {
    return false;
  }

  async actualizarDatosEmision(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }
}

function fila(props: {
  id: string;
  cuil: string;
  monto: number;
  tipo?: string;
  categoriaContribucion?: string | null;
}): ImportacionFila {
  return ImportacionFila.create({
    id: props.id,
    numeroFila: 2,
    cuil: props.cuil,
    nombre: 'Empleado',
    apellido: 'Test',
    concepto: props.tipo ? 'Sueldo básico' : 'Concepto nuevo',
    montoOriginal: String(props.monto),
    monto: props.monto,
    valida: true,
    errorMensaje: null,
    clasificacion: props.tipo
      ? ClasificacionConcepto.create(props.tipo, props.categoriaContribucion ?? null)
      : null,
  });
}

describe('ValidarImportacionUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let useCase: ValidarImportacionUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    useCase = new ValidarImportacionUseCase(empresaRepository, importacionRepository);
  });

  it('calcula totales y permite emitir cuando todo está clasificado y sin período anterior', async () => {
    importacionRepository.importaciones.push(
      Importacion.create({
        id: 'importacion-actual',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'julio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
        filas: [fila({ id: 'f1', cuil: CUIL_A, monto: 1000, tipo: 'remunerativo' })],
      }),
    );

    const resultado = await useCase.execute({
      importacionId: 'importacion-actual',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.puedeEmitirse).toBe(true);
    expect(resultado.erroresGlobales).toHaveLength(0);
    expect(resultado.empleados).toHaveLength(1);
    expect(resultado.empleados[0].totales.neto).toBe(1000);
  });

  it('reporta un error global cuando hay conceptos sin clasificar, y no puede emitirse', async () => {
    importacionRepository.importaciones.push(
      Importacion.create({
        id: 'importacion-actual',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'julio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
        filas: [fila({ id: 'f1', cuil: CUIL_B, monto: 500 })],
      }),
    );

    const resultado = await useCase.execute({
      importacionId: 'importacion-actual',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.puedeEmitirse).toBe(false);
    expect(resultado.erroresGlobales[0]).toMatch(/sin clasificar/);
  });

  it('bloquea un empleado que no tiene ningún concepto remunerativo', async () => {
    importacionRepository.importaciones.push(
      Importacion.create({
        id: 'importacion-actual',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'julio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
        filas: [fila({ id: 'f1', cuil: CUIL_A, monto: 100, tipo: 'deduccion', categoriaContribucion: 'otros' })],
      }),
    );

    const resultado = await useCase.execute({
      importacionId: 'importacion-actual',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.puedeEmitirse).toBe(false);
    expect(resultado.empleados[0].errores).toContain('No tiene ningún concepto remunerativo');
  });

  it('advierte si el neto varía mucho respecto del período confirmado anterior', async () => {
    importacionRepository.importaciones.push(
      Importacion.create({
        id: 'importacion-anterior',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 6,
        nombreArchivo: 'junio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-06-17T00:00:00.000Z'),
        filas: [fila({ id: 'f0', cuil: CUIL_A, monto: 500, tipo: 'remunerativo' })],
      }),
      Importacion.create({
        id: 'importacion-actual',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'julio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
        filas: [fila({ id: 'f1', cuil: CUIL_A, monto: 1000, tipo: 'remunerativo' })],
      }),
    );

    const resultado = await useCase.execute({
      importacionId: 'importacion-actual',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.puedeEmitirse).toBe(true);
    expect(resultado.empleados[0].advertencias).toHaveLength(1);
    expect(resultado.empleados[0].advertencias[0]).toMatch(/varió/);
  });

  it('no advierte si la única importación anterior tiene ese empleado sin clasificar', async () => {
    importacionRepository.importaciones.push(
      Importacion.create({
        id: 'importacion-anterior',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 6,
        nombreArchivo: 'junio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-06-17T00:00:00.000Z'),
        filas: [fila({ id: 'f0', cuil: CUIL_A, monto: 500 })], // sin clasificar
      }),
      Importacion.create({
        id: 'importacion-actual',
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'julio.csv',
        estado: 'confirmada',
        fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
        filas: [fila({ id: 'f1', cuil: CUIL_A, monto: 1000, tipo: 'remunerativo' })],
      }),
    );

    const resultado = await useCase.execute({
      importacionId: 'importacion-actual',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.empleados[0].advertencias).toHaveLength(0);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({ importacionId: 'x', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la importación no existe', async () => {
    await expect(
      useCase.execute({ importacionId: 'no-existe', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(NotFoundError);
  });
});
