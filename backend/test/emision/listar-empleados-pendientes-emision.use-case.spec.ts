import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ListarEmpleadosPendientesDeEmisionUseCase } from '../../src/modules/emision/application/listar-empleados-pendientes-emision.use-case';
import { Recibo } from '../../src/modules/emision/domain/recibo.entity';
import { CrearReciboData, ReciboHistorialPagina, ReciboRepository } from '../../src/modules/emision/domain/recibo.repository';
import { ReciboSnapshot } from '../../src/modules/emision/domain/recibo-snapshot';
import { Empleado } from '../../src/modules/empleados/domain/empleado.entity';
import { EmpleadoRepository } from '../../src/modules/empleados/domain/empleado.repository';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';
const IMPORTACION_ID = 'importacion-1';
const CUIL_JUAN = '27309876542';
const CUIL_ANA = '20123456786';

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
    return Empresa.create({ id: EMPRESA_ID, usuarioId: USUARIO_ID, razonSocial: 'Acme SA', cuit: '20123456786' });
  }

  async actualizar(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  importaciones: Importacion[] = [];

  seed(importacion: Importacion): void {
    this.importaciones.push(importacion);
  }

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

  async findConfirmadasAnteriores(): Promise<Importacion[]> {
    throw new Error('no usado en este test');
  }

  async existeOtraEnMismoPeriodo(): Promise<boolean> {
    return false;
  }

  async actualizarDatosEmision(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }
}

class EmpleadoRepositoryFake implements EmpleadoRepository {
  empleados: Empleado[] = [];

  async create(): Promise<Empleado> {
    throw new Error('no usado en este test');
  }

  async crearVarios(): Promise<void> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(): Promise<Empleado[]> {
    throw new Error('no usado en este test');
  }

  async findByCuilAndEmpresa(): Promise<Empleado | null> {
    throw new Error('no usado en este test');
  }

  async findAllByCuilsAndEmpresa(empresaId: string, cuils: string[]): Promise<Empleado[]> {
    return this.empleados.filter((e) => e.empresaId === empresaId && cuils.includes(e.cuil.value));
  }

  async findByIdAndEmpresa(): Promise<Empleado | null> {
    throw new Error('no usado en este test');
  }

  async actualizar(): Promise<Empleado> {
    throw new Error('no usado en este test');
  }
}

class ReciboRepositoryFake implements ReciboRepository {
  recibos: Recibo[] = [];

  async create(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }

  async crearConAuditoria(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }

  async findAllByImportacion(importacionId: string): Promise<Recibo[]> {
    return this.recibos.filter((r) => r.importacionId === importacionId);
  }

  async findVigentesByImportacion(): Promise<Recibo[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndImportacion(): Promise<Recibo | null> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(): Promise<ReciboHistorialPagina> {
    throw new Error('no usado en este test');
  }

  async findByReemplazaAId(): Promise<Recibo | null> {
    throw new Error('no usado en este test');
  }

  async anular(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }

  async contarPorEmpresa(): Promise<number> {
    throw new Error('no usado en este test');
  }
}

function fila(cuil: string, nombre: string, apellido: string, id: string): ImportacionFila {
  return ImportacionFila.create({
    id,
    numeroFila: 2,
    cuil,
    nombre,
    apellido,
    concepto: 'Sueldo básico',
    montoOriginal: '1000',
    monto: 1000,
    valida: true,
    errorMensaje: null,
  });
}

function reciboDe(empleadoId: string): Recibo {
  return Recibo.create({
    id: `recibo-${empleadoId}`,
    importacionId: IMPORTACION_ID,
    empleadoId,
    numero: 1,
    snapshot: {} as ReciboSnapshot,
    pdfPath: 'x',
    hashIntegridad: 'x',
    fechaEmision: new Date(),
  });
}

function empleado(id: string, cuil: string, estado: 'activo' | 'inactivo', nombre = 'Nombre', apellido = 'Apellido'): Empleado {
  return Empleado.create({ id, empresaId: EMPRESA_ID, nombre, apellido, cuil, estado });
}

function importacionConfirmada(filas: ImportacionFila[]): Importacion {
  return Importacion.create({
    id: IMPORTACION_ID,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 9,
    nombreArchivo: 'septiembre.xlsx',
    estado: 'confirmada',
    fechaImportacion: new Date('2026-09-01'),
    filas,
  });
}

describe('ListarEmpleadosPendientesDeEmisionUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let empleadoRepository: EmpleadoRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let useCase: ListarEmpleadosPendientesDeEmisionUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    empleadoRepository = new EmpleadoRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    useCase = new ListarEmpleadosPendientesDeEmisionUseCase(
      empresaRepository,
      importacionRepository,
      empleadoRepository,
      reciboRepository,
    );
  });

  it('devuelve vacío si la importación todavía no está confirmada (no hay nada que emitir todavía)', async () => {
    importacionRepository.seed(
      Importacion.create({
        id: IMPORTACION_ID,
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 9,
        nombreArchivo: 'septiembre.xlsx',
        estado: 'previsualizada',
        fechaImportacion: new Date('2026-09-01'),
        filas: [fila(CUIL_JUAN, 'Juan', 'Perez', 'f1')],
      }),
    );
    empleadoRepository.empleados.push(empleado('empleado-juan', CUIL_JUAN, 'activo'));

    const resultado = await useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toEqual([]);
  });

  it('devuelve vacío si todos los empleados activos de la importación ya tienen recibo', async () => {
    importacionRepository.seed(importacionConfirmada([fila(CUIL_JUAN, 'Juan', 'Perez', 'f1')]));
    empleadoRepository.empleados.push(empleado('empleado-juan', CUIL_JUAN, 'activo'));
    reciboRepository.recibos.push(reciboDe('empleado-juan'));

    const resultado = await useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toEqual([]);
  });

  it('devuelve al empleado reactivado que quedó sin recibo (caso real: CUIL inactivo al emitir, reactivado después)', async () => {
    importacionRepository.seed(
      importacionConfirmada([fila(CUIL_JUAN, 'Juan', 'Perez', 'f1'), fila(CUIL_ANA, 'Ana', 'Gomez', 'f2')]),
    );
    empleadoRepository.empleados.push(
      empleado('empleado-juan', CUIL_JUAN, 'activo', 'Juan', 'Perez'),
      // Ana estaba inactiva al emitir (se salteó); ahora ya está reactivada.
      empleado('empleado-ana', CUIL_ANA, 'activo', 'Ana', 'Gomez'),
    );
    reciboRepository.recibos.push(reciboDe('empleado-juan'));

    const resultado = await useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('empleado-ana');
  });

  it('no devuelve a un empleado todavía inactivo, aunque no tenga recibo', async () => {
    importacionRepository.seed(
      importacionConfirmada([fila(CUIL_JUAN, 'Juan', 'Perez', 'f1'), fila(CUIL_ANA, 'Ana', 'Gomez', 'f2')]),
    );
    empleadoRepository.empleados.push(
      empleado('empleado-juan', CUIL_JUAN, 'activo'),
      empleado('empleado-ana', CUIL_ANA, 'inactivo'),
    );
    reciboRepository.recibos.push(reciboDe('empleado-juan'));

    const resultado = await useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toEqual([]);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;
    importacionRepository.seed(importacionConfirmada([fila(CUIL_JUAN, 'Juan', 'Perez', 'f1')]));

    await expect(
      useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la importación no existe', async () => {
    await expect(
      useCase.execute({ importacionId: 'no-existe', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(NotFoundError);
  });
});
