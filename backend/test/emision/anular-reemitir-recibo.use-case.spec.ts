import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
import { AnularReciboUseCase } from '../../src/modules/emision/application/anular-recibo.use-case';
import { ReemitirReciboUseCase } from '../../src/modules/emision/application/reemitir-recibo.use-case';
import { AlmacenamientoRecibos, GuardarReciboParams } from '../../src/modules/emision/domain/almacenamiento-recibos';
import { GeneradorPdf } from '../../src/modules/emision/domain/generador-pdf';
import { Recibo } from '../../src/modules/emision/domain/recibo.entity';
import {
  ActualizarEmpleadoData,
  EmpleadoRepository,
} from '../../src/modules/empleados/domain/empleado.repository';
import {
  CrearReciboData,
  ReciboFiltroEmpresa,
  ReciboHistorialPagina,
  ReciboRepository,
} from '../../src/modules/emision/domain/recibo.repository';
import { ReciboSnapshot } from '../../src/modules/emision/domain/recibo-snapshot';
import { AuditLogRepository, CrearAuditLogEntryData } from '../../src/infra/auditoria/audit-log.repository';
import { ValidarImportacionUseCase } from '../../src/modules/validacion/application/validar-importacion.use-case';
import { Empleado } from '../../src/modules/empleados/domain/empleado.entity';
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

class AuditLogRepositoryFake implements AuditLogRepository {
  entradas: CrearAuditLogEntryData[] = [];

  async findByEntidad() {
    throw new Error('no usado en este test');
  }

  async create(data: CrearAuditLogEntryData): Promise<void> {
    this.entradas.push(data);
  }
}

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
      domicilio: 'Av. Siempre Viva 742',
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

  async agruparFilasSinClasificarPorConcepto(): Promise<Map<string, string[]>> {
    throw new Error('no usado en este test');
  }

  async actualizarClasificacionPorIds(): Promise<number> {
    throw new Error('no usado en este test');
  }

  async findConfirmadasAnteriores(): Promise<Importacion[]> {
    return [];
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

  async findByCuilAndEmpresa(empresaId: string, cuil: string): Promise<Empleado | null> {
    return this.empleados.find((e) => e.empresaId === empresaId && e.cuil.value === cuil) ?? null;
  }

  async findAllByCuilsAndEmpresa(empresaId: string, cuils: string[]): Promise<Empleado[]> {
    return this.empleados.filter((e) => e.empresaId === empresaId && cuils.includes(e.cuil.value));
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Empleado | null> {
    return this.empleados.find((e) => e.id === id && e.empresaId === empresaId) ?? null;
  }

  async actualizar(id: string, data: ActualizarEmpleadoData): Promise<Empleado> {
    const empleado = this.empleados.find((e) => e.id === id);
    if (!empleado) throw new Error('empleado no encontrado en el fake');
    const actualizado = Empleado.create({
      id: empleado.id,
      empresaId: empleado.empresaId,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      cuil: empleado.cuil.value,
      estado: empleado.estado,
      categoria: data.categoria ?? empleado.categoria,
      fechaIngreso: data.fechaIngreso ?? empleado.fechaIngreso,
      legajo: empleado.legajo,
      banco: empleado.banco,
    });
    this.empleados = this.empleados.map((e) => (e.id === id ? actualizado : e));
    return actualizado;
  }
}

class ReciboRepositoryFake implements ReciboRepository {
  recibos: Recibo[] = [];

  seed(recibo: Recibo): void {
    this.recibos.push(recibo);
  }

  async create(data: CrearReciboData): Promise<Recibo> {
    const recibo = Recibo.create({
      id: `recibo-${this.recibos.length + 1}`,
      importacionId: data.importacionId,
      empleadoId: data.empleadoId,
      numero: data.numero,
      snapshot: data.snapshot,
      pdfPath: data.pdfPath,
      hashIntegridad: data.hashIntegridad,
      fechaEmision: new Date('2026-08-01T00:00:00.000Z'),
      reemplazaAId: data.reemplazaAId ?? null,
    });
    this.recibos.push(recibo);
    return recibo;
  }

  async crearConAuditoria(): Promise<Recibo> {
    throw new Error('no usado en este test');
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

  async findAllByEmpresa(_empresaId: string, _filtro?: ReciboFiltroEmpresa): Promise<ReciboHistorialPagina> {
    throw new Error('no usado en este test');
  }

  async findByReemplazaAId(reciboId: string): Promise<Recibo | null> {
    return this.recibos.find((r) => r.reemplazaAId === reciboId) ?? null;
  }

  async contarPorEmpresa(): Promise<number> {
    return this.recibos.length;
  }

  async anular(id: string, motivo: string): Promise<Recibo> {
    const recibo = this.recibos.find((r) => r.id === id);
    if (!recibo) throw new Error('recibo no encontrado en el fake');
    const anulado = Recibo.create({
      id: recibo.id,
      importacionId: recibo.importacionId,
      empleadoId: recibo.empleadoId,
      numero: recibo.numero,
      snapshot: recibo.snapshot,
      pdfPath: recibo.pdfPath,
      hashIntegridad: recibo.hashIntegridad,
      fechaEmision: recibo.fechaEmision,
      estado: 'anulado',
      motivoAnulacion: motivo,
      reemplazaAId: recibo.reemplazaAId,
    });
    this.recibos = this.recibos.map((r) => (r.id === id ? anulado : r));
    return anulado;
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
    // La ruta incluye el número: un empleado con recibo anulado + reemplazo en
    // la misma importación no debe pisar el PDF del anulado (ver ADR-046).
    return `${params.empresaId}/${params.importacionId}/${params.empleadoId}-${params.numero}.pdf`;
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

function importacionLista(overrides: Partial<Importacion> = {}): Importacion {
  return Importacion.create({
    id: IMPORTACION_ID,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 8,
    nombreArchivo: 'agosto.csv',
    estado: 'confirmada',
    fechaImportacion: new Date('2026-08-01T00:00:00.000Z'),
    fechaPago: new Date('2026-08-05'),
    lugarPago: 'CABA',
    fechaPagoCargasSociales: new Date('2026-08-10'),
    lugarPagoCargasSociales: 'CABA',
    filas: [filaRemunerativa(CUIL_JUAN, 'Juan', 'Perez', 1000, 'f1')],
    ...overrides,
  });
}

function snapshotBase(): ReciboSnapshot {
  return {
    empresa: { razonSocial: 'Acme SA', cuit: '20-12345678-6', domicilio: null, localidad: null, provincia: null, codigoPostal: null },
    empleado: { nombre: 'Juan', apellido: 'Perez', cuil: '27-30987654-2', categoria: null, fechaIngreso: null, antiguedad: '—', legajo: null, banco: null },
    periodo: { anio: 2026, mes: 8, fechaPago: '2026-08-05', lugarPago: 'CABA', fechaPagoCargasSociales: '2026-08-10', lugarPagoCargasSociales: 'CABA' },
    conceptos: [{ concepto: 'Sueldo básico', tipo: 'remunerativo', categoriaContribucion: null, monto: 1000, unidad: null, base: null }],
    totales: { totalBruto: 1000, totalDeducciones: 0, totalContribucionesPatronales: 0, neto: 1000, costoLaboralTotal: 1000 },
    segmentosCostoLaboral: [],
    detalleComposicionSalarial: [],
  };
}

describe('AnularReciboUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let useCase: AnularReciboUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    useCase = new AnularReciboUseCase(empresaRepository, importacionRepository, reciboRepository);

    importacionRepository.seed(importacionLista());
    reciboRepository.seed(
      Recibo.create({
        id: 'recibo-1',
        importacionId: IMPORTACION_ID,
        empleadoId: 'empleado-juan',
        numero: 1,
        snapshot: snapshotBase(),
        pdfPath: 'x.pdf',
        hashIntegridad: 'hash1',
        fechaEmision: new Date('2026-08-01'),
      }),
    );
  });

  it('anula un recibo vigente con su motivo', async () => {
    const anulado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      reciboId: 'recibo-1',
      motivo: 'Monto incorrecto, se cargó un concepto de más',
    });

    expect(anulado.estado).toBe('anulado');
    expect(anulado.motivoAnulacion).toBe('Monto incorrecto, se cargó un concepto de más');
    expect(anulado.estaVigente()).toBe(false);
  });

  it('rechaza anular un recibo que ya está anulado', async () => {
    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      reciboId: 'recibo-1',
      motivo: 'Primer motivo',
    });

    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        reciboId: 'recibo-1',
        motivo: 'Segundo motivo',
      }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        reciboId: 'recibo-1',
        motivo: 'motivo',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si el recibo no existe en esa importación', async () => {
    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        reciboId: 'no-existe',
        motivo: 'motivo',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('ReemitirReciboUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let empleadoRepository: EmpleadoRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let generadorPdf: GeneradorPdfFake;
  let almacenamiento: AlmacenamientoRecibosFake;
  let auditLogRepository: AuditLogRepositoryFake;
  let useCase: ReemitirReciboUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    empleadoRepository = new EmpleadoRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    generadorPdf = new GeneradorPdfFake();
    almacenamiento = new AlmacenamientoRecibosFake();
    auditLogRepository = new AuditLogRepositoryFake();

    const validarImportacion = new ValidarImportacionUseCase(empresaRepository, importacionRepository, empleadoRepository);
    useCase = new ReemitirReciboUseCase(
      empresaRepository,
      importacionRepository,
      empleadoRepository,
      reciboRepository,
      generadorPdf,
      almacenamiento,
      auditLogRepository,
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
        legajo: '0001',
        banco: 'Banco Nación',
      }),
    );
    importacionRepository.seed(importacionLista());
    reciboRepository.seed(
      Recibo.create({
        id: 'recibo-1',
        importacionId: IMPORTACION_ID,
        empleadoId: 'empleado-juan',
        numero: 1,
        snapshot: snapshotBase(),
        pdfPath: 'x.pdf',
        hashIntegridad: 'hash1',
        fechaEmision: new Date('2026-08-01'),
        estado: 'anulado',
        motivoAnulacion: 'Monto incorrecto',
      }),
    );
  });

  it('reemite un recibo anulado con los datos ACTUALES del empleado', async () => {
    // La categoría cambió después de anular — el recibo reemitido debe reflejar la nueva.
    await empleadoRepository.actualizar('empleado-juan', { categoria: 'Encargado' });

    const reemplazo = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      reciboId: 'recibo-1',
    });

    expect(reemplazo.estaVigente()).toBe(true);
    expect(reemplazo.reemplazaAId).toBe('recibo-1');
    expect(reemplazo.numero).toBe(2);
    expect(reemplazo.snapshot.empleado.categoria).toBe('Encargado');
    expect(generadorPdf.snapshotsRecibidos).toHaveLength(1);
    expect(almacenamiento.guardados).toHaveLength(1);
    // El PDF del reemplazo NO debe pisar el del anulado: su ruta es distinta
    // (el recibo anulado original era numero 1, este reemplazo es numero 2).
    expect(almacenamiento.guardados[0].numero).toBe(2);
    expect(reemplazo.pdfPath).toContain('-2.pdf');
  });

  it('aplica un ajuste puntual al recibo de reemplazo sin tocar la fila original de la importación', async () => {
    const reemplazo = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      reciboId: 'recibo-1',
      ajustes: [{ filaId: 'f1', cambios: { monto: '1500' } }],
    });

    expect(reemplazo.snapshot.conceptos[0].monto).toBe(1500);
    expect(reemplazo.snapshot.totales.totalBruto).toBe(1500);
    // La fila de origen de la importación queda intacta (ADR-071).
    const filaOriginal = importacionRepository.importaciones[0].filas.find((f) => f.id === 'f1');
    expect(filaOriginal?.monto).toBe(1000);
    // Queda auditado qué se ajustó, ya que el dato de origen no lo refleja.
    expect(auditLogRepository.entradas).toHaveLength(1);
    expect(auditLogRepository.entradas[0]).toMatchObject({
      entidad: 'Recibo',
      accion: 'ajuste-reemision',
      campo: 'fila-2',
    });
  });

  it('rechaza la reemisión si el ajuste deja la fila inválida', async () => {
    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        reciboId: 'recibo-1',
        ajustes: [{ filaId: 'f1', cambios: { monto: 'no-es-un-numero' } }],
      }),
    ).rejects.toThrow(DomainError);

    // No debe haber generado ni PDF ni recibo alguno ante el rechazo.
    expect(generadorPdf.snapshotsRecibidos).toHaveLength(0);
    expect(reciboRepository.recibos).toHaveLength(1);
  });

  it('rechaza reemitir un recibo vigente (no anulado)', async () => {
    reciboRepository.recibos = reciboRepository.recibos.map((r) =>
      r.id === 'recibo-1'
        ? Recibo.create({ ...r, estado: 'vigente', motivoAnulacion: null })
        : r,
    );

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: 'recibo-1' }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza reemitir un recibo anulado que ya tiene un reemplazo', async () => {
    await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: 'recibo-1' });

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: 'recibo-1' }),
    ).rejects.toThrow('Este recibo ya fue reemitido');
  });

  it('rechaza reemitir si la validación actual tiene errores globales pendientes', async () => {
    importacionRepository.importaciones = [
      importacionLista({
        filas: [
          filaRemunerativa(CUIL_JUAN, 'Juan', 'Perez', 1000, 'f1'),
          // Fila de otro empleado sin clasificar: dispara un error global de validación.
          ImportacionFila.create({
            id: 'f2',
            numeroFila: 3,
            cuil: CUIL_ANA,
            nombre: 'Ana',
            apellido: 'Gomez',
            concepto: 'Concepto nuevo',
            montoOriginal: '500',
            monto: 500,
            valida: true,
            errorMensaje: null,
          }),
        ],
      }),
    ];

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: 'recibo-1' }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: 'recibo-1' }),
    ).rejects.toThrow(NotFoundError);
  });
});
