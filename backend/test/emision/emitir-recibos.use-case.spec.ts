import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
import { EmitirRecibosUseCase } from '../../src/modules/emision/application/emitir-recibos.use-case';
import { AlmacenamientoRecibos, GuardarReciboParams } from '../../src/modules/emision/domain/almacenamiento-recibos';
import { GeneradorPdf } from '../../src/modules/emision/domain/generador-pdf';
import { Recibo } from '../../src/modules/emision/domain/recibo.entity';
import { CrearReciboData, ReciboRepository } from '../../src/modules/emision/domain/recibo.repository';
import { ReciboSnapshot } from '../../src/modules/emision/domain/recibo-snapshot';
import { ValidarImportacionUseCase } from '../../src/modules/validacion/application/validar-importacion.use-case';
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

  async actualizarDatosEmision(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }
}

class EmpleadoRepositoryFake implements EmpleadoRepository {
  empleados: Empleado[] = [];

  async create(): Promise<Empleado> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(): Promise<Empleado[]> {
    throw new Error('no usado en este test');
  }

  async findByCuilAndEmpresa(empresaId: string, cuil: string): Promise<Empleado | null> {
    return this.empleados.find((e) => e.empresaId === empresaId && e.cuil.value === cuil) ?? null;
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

  async create(data: CrearReciboData): Promise<Recibo> {
    const recibo = Recibo.create({
      id: `recibo-${this.recibos.length + 1}`,
      importacionId: data.importacionId,
      empleadoId: data.empleadoId,
      numero: data.numero,
      snapshot: data.snapshot,
      pdfPath: data.pdfPath,
      hashIntegridad: data.hashIntegridad,
      fechaEmision: new Date('2026-07-17T00:00:00.000Z'),
    });
    this.recibos.push(recibo);
    return recibo;
  }

  async findAllByImportacion(importacionId: string): Promise<Recibo[]> {
    return this.recibos.filter((r) => r.importacionId === importacionId);
  }

  async findVigentesByImportacion(importacionId: string): Promise<Recibo[]> {
    return this.recibos.filter((r) => r.importacionId === importacionId && r.estaVigente());
  }

  async findByIdAndImportacion(id: string, importacionId: string): Promise<Recibo | null> {
    return this.recibos.find((r) => r.id === id && r.importacionId === importacionId) ?? null;
  }

  async findAllByEmpresa(): Promise<Recibo[]> {
    throw new Error('no usado en este test');
  }

  async findByReemplazaAId(): Promise<Recibo | null> {
    throw new Error('no usado en este test');
  }

  async anular(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }

  // Simplificación válida en este archivo: todos los recibos de la fake pertenecen
  // a la misma empresa, así que "contar por empresa" es simplemente el total.
  async contarPorEmpresa(): Promise<number> {
    return this.recibos.length;
  }
}

class GeneradorPdfFake implements GeneradorPdf {
  snapshotsRecibidos: ReciboSnapshot[] = [];

  async generar(snapshot: ReciboSnapshot): Promise<Buffer> {
    this.snapshotsRecibidos.push(snapshot);
    return Buffer.from('PDF-FAKE');
  }
}

class AlmacenamientoRecibosFake implements AlmacenamientoRecibos {
  guardados: GuardarReciboParams[] = [];

  async guardar(params: GuardarReciboParams): Promise<string> {
    this.guardados.push(params);
    return `${params.empresaId}/${params.importacionId}/${params.empleadoId}.pdf`;
  }

  async leer(): Promise<Buffer> {
    throw new Error('no usado en este test');
  }
}

function filaRemunerativa(cuil: string, nombre: string, apellido: string, monto: number, id: string): ImportacionFila {
  return ImportacionFila.create({
    id,
    numeroFila: 2,
    cuil,
    nombre,
    apellido,
    concepto: 'Sueldo básico',
    montoOriginal: String(monto),
    monto,
    valida: true,
    errorMensaje: null,
    clasificacion: ClasificacionConcepto.create('remunerativo', null),
  });
}

function filaContribucion(cuil: string, nombre: string, apellido: string, monto: number, id: string): ImportacionFila {
  return ImportacionFila.create({
    id,
    numeroFila: 3,
    cuil,
    nombre,
    apellido,
    concepto: 'Aporte sindical',
    montoOriginal: String(monto),
    monto,
    valida: true,
    errorMensaje: null,
    clasificacion: ClasificacionConcepto.create('contribucion_patronal', 'sindical'),
  });
}

function importacionLista(overrides: Partial<Importacion> = {}): Importacion {
  return Importacion.create({
    id: IMPORTACION_ID,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 7,
    nombreArchivo: 'julio.csv',
    estado: 'confirmada',
    fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
    fechaPago: new Date('2026-07-05'),
    lugarPago: 'CABA',
    fechaPagoCargasSociales: new Date('2026-07-10'),
    lugarPagoCargasSociales: 'CABA',
    filas: [filaRemunerativa(CUIL_JUAN, 'Juan', 'Perez', 1000, 'f1'), filaContribucion(CUIL_JUAN, 'Juan', 'Perez', 50, 'f2')],
    ...overrides,
  });
}

describe('EmitirRecibosUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let empleadoRepository: EmpleadoRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let generadorPdf: GeneradorPdfFake;
  let almacenamiento: AlmacenamientoRecibosFake;
  let useCase: EmitirRecibosUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    empleadoRepository = new EmpleadoRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    generadorPdf = new GeneradorPdfFake();
    almacenamiento = new AlmacenamientoRecibosFake();

    const validarImportacion = new ValidarImportacionUseCase(empresaRepository, importacionRepository);

    useCase = new EmitirRecibosUseCase(
      empresaRepository,
      importacionRepository,
      empleadoRepository,
      reciboRepository,
      generadorPdf,
      almacenamiento,
      validarImportacion,
    );

    empleadoRepository.empleados.push(
      Empleado.create({
        id: 'empleado-juan',
        empresaId: EMPRESA_ID,
        nombre: 'Juan',
        apellido: 'Perez',
        cuil: CUIL_JUAN,
        estado: 'activo',
        categoria: 'Administrativo',
        fechaIngreso: new Date('2024-01-10'),
      }),
    );
  });

  it('emite un recibo por empleado, con snapshot, hash y pdf guardado', async () => {
    importacionRepository.seed(importacionLista());

    const recibos = await useCase.execute({
      importacionId: IMPORTACION_ID,
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(recibos).toHaveLength(1);
    const [recibo] = recibos;
    expect(recibo.numero).toBe(1);
    expect(recibo.empleadoId).toBe('empleado-juan');
    expect(recibo.hashIntegridad).toMatch(/^[a-f0-9]{64}$/);
    expect(recibo.snapshot.totales).toEqual({
      totalBruto: 1000,
      totalDeducciones: 0,
      totalContribucionesPatronales: 50,
      neto: 1000,
      costoLaboralTotal: 1050,
    });
    expect(recibo.snapshot.empleado.antiguedad).toBe('2 años y 6 meses');
    expect(generadorPdf.snapshotsRecibidos).toHaveLength(1);
    expect(almacenamiento.guardados).toEqual([
      { empresaId: EMPRESA_ID, importacionId: IMPORTACION_ID, empleadoId: 'empleado-juan', numero: 1, contenido: expect.any(Buffer) },
    ]);
  });

  it('numera los recibos correlativamente a partir de los ya emitidos por la empresa', async () => {
    importacionRepository.seed(importacionLista());
    // 5 recibos "ya emitidos" antes, de otra importación de la misma empresa.
    for (let i = 0; i < 5; i += 1) {
      reciboRepository.recibos.push(
        Recibo.create({
          id: `previo-${i}`,
          importacionId: 'otra-importacion',
          empleadoId: 'otro-empleado',
          numero: i + 1,
          snapshot: {} as ReciboSnapshot,
          pdfPath: 'x',
          hashIntegridad: 'x',
          fechaEmision: new Date(),
        }),
      );
    }

    const [recibo] = await useCase.execute({
      importacionId: IMPORTACION_ID,
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(recibo.numero).toBe(6);
  });

  it('emite un recibo por cada CUIL distinto de la importación', async () => {
    empleadoRepository.empleados.push(
      Empleado.create({
        id: 'empleado-ana',
        empresaId: EMPRESA_ID,
        nombre: 'Ana',
        apellido: 'Gomez',
        cuil: CUIL_ANA,
        estado: 'activo',
      }),
    );
    importacionRepository.seed(
      importacionLista({
        filas: [
          filaRemunerativa(CUIL_JUAN, 'Juan', 'Perez', 1000, 'f1'),
          filaRemunerativa(CUIL_ANA, 'Ana', 'Gomez', 2000, 'f2'),
        ],
      }),
    );

    const recibos = await useCase.execute({
      importacionId: IMPORTACION_ID,
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(recibos).toHaveLength(2);
    expect(recibos.map((r) => r.numero).sort()).toEqual([1, 2]);
  });

  it('no emite recibo para un empleado dado de baja (inactivo), pero sí para el resto', async () => {
    empleadoRepository.empleados.push(
      Empleado.create({
        id: 'empleado-ana',
        empresaId: EMPRESA_ID,
        nombre: 'Ana',
        apellido: 'Gomez',
        cuil: CUIL_ANA,
        estado: 'inactivo',
      }),
    );
    importacionRepository.seed(
      importacionLista({
        filas: [
          filaRemunerativa(CUIL_JUAN, 'Juan', 'Perez', 1000, 'f1'),
          filaRemunerativa(CUIL_ANA, 'Ana', 'Gomez', 2000, 'f2'),
        ],
      }),
    );

    const recibos = await useCase.execute({
      importacionId: IMPORTACION_ID,
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(recibos).toHaveLength(1);
    expect(recibos[0].empleadoId).toBe('empleado-juan');
  });

  it('rechaza si la importación no está confirmada', async () => {
    importacionRepository.seed(importacionLista({ estado: 'previsualizada' }));

    await expect(
      useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si faltan datos de emisión', async () => {
    importacionRepository.seed(importacionLista({ lugarPago: null }));

    await expect(
      useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza re-emitir si ya existen recibos para la importación', async () => {
    importacionRepository.seed(importacionLista());
    reciboRepository.recibos.push(
      Recibo.create({
        id: 'ya-emitido',
        importacionId: IMPORTACION_ID,
        empleadoId: 'empleado-juan',
        numero: 1,
        snapshot: {} as ReciboSnapshot,
        pdfPath: 'x',
        hashIntegridad: 'x',
        fechaEmision: new Date(),
      }),
    );

    await expect(
      useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow('Ya se emitieron recibos para esta importación');
  });

  it('rechaza si la validación de la importación tiene errores pendientes', async () => {
    importacionRepository.seed(
      importacionLista({
        filas: [
          ImportacionFila.create({
            id: 'sin-clasificar',
            numeroFila: 2,
            cuil: CUIL_JUAN,
            nombre: 'Juan',
            apellido: 'Perez',
            concepto: 'Concepto nuevo',
            montoOriginal: '100',
            monto: 100,
            valida: true,
            errorMensaje: null,
          }),
        ],
      }),
    );

    await expect(
      useCase.execute({ importacionId: IMPORTACION_ID, empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;
    importacionRepository.seed(importacionLista());

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
