import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { DescargarLoteRecibosUseCase } from '../../src/modules/emision/application/descargar-lote-recibos.use-case';
import { ListarHistorialRecibosEmpresaUseCase } from '../../src/modules/emision/application/listar-historial-recibos-empresa.use-case';
import { ListarRecibosUseCase } from '../../src/modules/emision/application/listar-recibos.use-case';
import { AlmacenamientoRecibos, GuardarReciboParams } from '../../src/modules/emision/domain/almacenamiento-recibos';
import { ArchivoParaEmpaquetar, EmpaquetadorZip } from '../../src/modules/emision/domain/empaquetador-zip';
import { Recibo } from '../../src/modules/emision/domain/recibo.entity';
import { ReciboFiltroEmpresa, ReciboRepository } from '../../src/modules/emision/domain/recibo.repository';
import { ReciboSnapshot } from '../../src/modules/emision/domain/recibo-snapshot';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';
const IMPORTACION_ID = 'importacion-1';

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
  importacion: Importacion | null = null;

  async create(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Importacion | null> {
    if (!this.importacion || this.importacion.id !== id || this.importacion.empresaId !== empresaId) return null;
    return this.importacion;
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

  async actualizarDatosEmision(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }
}

class ReciboRepositoryFake implements ReciboRepository {
  recibos: Recibo[] = [];

  async create(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }

  async findAllByImportacion(importacionId: string): Promise<Recibo[]> {
    return this.recibos.filter((r) => r.importacionId === importacionId);
  }

  async findVigentesByImportacion(importacionId: string): Promise<Recibo[]> {
    return this.recibos.filter((r) => r.importacionId === importacionId && r.estaVigente());
  }

  async findByIdAndImportacion(): Promise<Recibo | null> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(_empresaId: string, filtro?: ReciboFiltroEmpresa): Promise<Recibo[]> {
    return this.recibos.filter((r) => (filtro?.empleadoId ? r.empleadoId === filtro.empleadoId : true));
  }

  async findByReemplazaAId(): Promise<Recibo | null> {
    throw new Error('no usado en este test');
  }

  async contarPorEmpresa(): Promise<number> {
    throw new Error('no usado en este test');
  }

  async anular(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }
}

class AlmacenamientoRecibosFake implements AlmacenamientoRecibos {
  async guardar(_params: GuardarReciboParams): Promise<string> {
    throw new Error('no usado en este test');
  }

  async leer(pdfPath: string): Promise<Buffer> {
    return Buffer.from(`contenido-de-${pdfPath}`);
  }
}

class EmpaquetadorZipFake implements EmpaquetadorZip {
  archivosRecibidos: ArchivoParaEmpaquetar[] = [];

  async crear(archivos: ArchivoParaEmpaquetar[]): Promise<Buffer> {
    this.archivosRecibidos = archivos;
    return Buffer.from(`zip-con-${archivos.length}-archivos`);
  }
}

function snapshot(nombre: string, apellido: string): ReciboSnapshot {
  return {
    empresa: { razonSocial: 'Acme SA', cuit: '20-12345678-6', domicilio: null, localidad: null, provincia: null, codigoPostal: null },
    empleado: { nombre, apellido, cuil: '27-30987654-2', categoria: null, fechaIngreso: null, antiguedad: '—', legajo: null, banco: null },
    periodo: { anio: 2026, mes: 8, fechaPago: '2026-08-05', lugarPago: 'CABA', fechaPagoCargasSociales: '2026-08-10', lugarPagoCargasSociales: 'CABA' },
    conceptos: [],
    totales: { totalBruto: 1000, totalDeducciones: 0, totalContribucionesPatronales: 0, neto: 1000, costoLaboralTotal: 1000 },
    segmentosCostoLaboral: [],
    detalleComposicionSalarial: [],
  };
}

function recibo(props: {
  id: string;
  empleadoId: string;
  numero: number;
  estado?: 'vigente' | 'anulado';
  motivoAnulacion?: string | null;
  nombre?: string;
  apellido?: string;
}): Recibo {
  return Recibo.create({
    id: props.id,
    importacionId: IMPORTACION_ID,
    empleadoId: props.empleadoId,
    numero: props.numero,
    snapshot: snapshot(props.nombre ?? 'Juan', props.apellido ?? 'Perez'),
    pdfPath: `${props.id}.pdf`,
    hashIntegridad: `hash-${props.id}`,
    fechaEmision: new Date('2026-08-01'),
    estado: props.estado ?? 'vigente',
    motivoAnulacion: props.motivoAnulacion ?? null,
  });
}

function importacionBase(props: Partial<{ anio: number; mes: number }> = {}): Importacion {
  return Importacion.create({
    id: IMPORTACION_ID,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: props.anio ?? 2026,
    mes: props.mes ?? 8,
    nombreArchivo: 'agosto.csv',
    estado: 'confirmada',
    fechaImportacion: new Date('2026-08-01'),
    filas: [
      ImportacionFila.create({
        id: 'f1',
        numeroFila: 2,
        cuil: '27309876542',
        nombre: 'Juan',
        apellido: 'Perez',
        concepto: 'Sueldo básico',
        montoOriginal: '1000',
        monto: 1000,
        valida: true,
        errorMensaje: null,
      }),
    ],
  });
}

describe('ListarRecibosUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let useCase: ListarRecibosUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    useCase = new ListarRecibosUseCase(empresaRepository, importacionRepository, reciboRepository);

    importacionRepository.importacion = importacionBase();
    reciboRepository.recibos = [
      recibo({ id: 'r1', empleadoId: 'e1', numero: 1, estado: 'anulado', motivoAnulacion: 'error' }),
      recibo({ id: 'r2', empleadoId: 'e1', numero: 2 }),
    ];
  });

  it('por defecto solo devuelve los recibos vigentes', async () => {
    const recibos = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID });

    expect(recibos.map((r) => r.id)).toEqual(['r2']);
  });

  it('con incluirAnulados devuelve vigentes y anulados', async () => {
    const recibos = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      incluirAnulados: true,
    });

    expect(recibos.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });
});

describe('ListarHistorialRecibosEmpresaUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let useCase: ListarHistorialRecibosEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    useCase = new ListarHistorialRecibosEmpresaUseCase(empresaRepository, reciboRepository);

    reciboRepository.recibos = [
      recibo({ id: 'r1', empleadoId: 'empleado-juan', numero: 1, estado: 'anulado', motivoAnulacion: 'error' }),
      recibo({ id: 'r2', empleadoId: 'empleado-juan', numero: 3 }),
      recibo({ id: 'r3', empleadoId: 'empleado-ana', numero: 2, nombre: 'Ana', apellido: 'Gomez' }),
    ];
  });

  it('devuelve el historial completo, vigentes y anulados', async () => {
    const recibos = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });
    expect(recibos).toHaveLength(3);
  });

  it('filtra por empleado cuando se indica', async () => {
    const recibos = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, empleadoId: 'empleado-juan' });
    expect(recibos.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;
    await expect(useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID })).rejects.toThrow(NotFoundError);
  });
});

describe('DescargarLoteRecibosUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let almacenamiento: AlmacenamientoRecibosFake;
  let empaquetadorZip: EmpaquetadorZipFake;
  let useCase: DescargarLoteRecibosUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    almacenamiento = new AlmacenamientoRecibosFake();
    empaquetadorZip = new EmpaquetadorZipFake();
    useCase = new DescargarLoteRecibosUseCase(
      empresaRepository,
      importacionRepository,
      reciboRepository,
      almacenamiento,
      empaquetadorZip,
    );

    importacionRepository.importacion = importacionBase({ anio: 2026, mes: 8 });
  });

  it('arma un zip con los pdf de los recibos vigentes', async () => {
    reciboRepository.recibos = [
      recibo({ id: 'r1', empleadoId: 'e1', numero: 1, estado: 'anulado', motivoAnulacion: 'error' }),
      recibo({ id: 'r2', empleadoId: 'e1', numero: 2 }),
      recibo({ id: 'r3', empleadoId: 'e2', numero: 3, nombre: 'Ana', apellido: 'Gomez' }),
    ];

    const resultado = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID });

    expect(empaquetadorZip.archivosRecibidos).toHaveLength(2);
    expect(resultado.nombreArchivo).toBe('recibos-2026-08.zip');
    expect(resultado.contenido.toString()).toBe('zip-con-2-archivos');
  });

  it('nombra cada pdf dentro del zip con el mismo criterio que la descarga individual', async () => {
    reciboRepository.recibos = [
      recibo({ id: 'r2', empleadoId: 'e1', numero: 2 }),
      recibo({ id: 'r3', empleadoId: 'e2', numero: 3, nombre: 'Ana', apellido: 'Gomez' }),
    ];

    await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID });

    const nombres = empaquetadorZip.archivosRecibidos.map((a) => a.nombre);
    expect(nombres).toContain('Recibo - Perez Juan - Agosto 2026.pdf');
    expect(nombres).toContain('Recibo - Gomez Ana - Agosto 2026.pdf');
  });

  it('desambigua con un sufijo numérico si dos recibos vigentes generan el mismo nombre de archivo', async () => {
    reciboRepository.recibos = [
      recibo({ id: 'r2', empleadoId: 'e1', numero: 2 }),
      recibo({ id: 'r3', empleadoId: 'e2', numero: 3 }),
    ];

    await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID });

    const nombres = empaquetadorZip.archivosRecibidos.map((a) => a.nombre).sort();
    expect(nombres).toEqual(['Recibo - Perez Juan - Agosto 2026 (2).pdf', 'Recibo - Perez Juan - Agosto 2026.pdf']);
  });

  it('rechaza si no hay recibos vigentes para descargar', async () => {
    reciboRepository.recibos = [recibo({ id: 'r1', empleadoId: 'e1', numero: 1, estado: 'anulado', motivoAnulacion: 'error' })];

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si la importación no existe', async () => {
    importacionRepository.importacion = null;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID }),
    ).rejects.toThrow(NotFoundError);
  });
});
