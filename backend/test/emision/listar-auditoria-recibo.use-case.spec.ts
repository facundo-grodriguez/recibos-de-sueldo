import { beforeEach, describe, expect, it } from 'vitest';
import { AuditLogEntry, AuditLogRepository } from '../../src/infra/auditoria/audit-log.repository';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ListarAuditoriaReciboUseCase } from '../../src/modules/emision/application/listar-auditoria-recibo.use-case';
import { Recibo } from '../../src/modules/emision/domain/recibo.entity';
import { ReciboRepository } from '../../src/modules/emision/domain/recibo.repository';
import { ReciboSnapshot } from '../../src/modules/emision/domain/recibo-snapshot';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';
const IMPORTACION_ID = 'importacion-1';
const RECIBO_ID = 'recibo-1';

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
  recibo: Recibo | null = null;

  async create(): Promise<Recibo> {
    throw new Error('no usado en este test');
  }

  async findAllByImportacion(): Promise<Recibo[]> {
    throw new Error('no usado en este test');
  }

  async findVigentesByImportacion(): Promise<Recibo[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndImportacion(id: string, importacionId: string): Promise<Recibo | null> {
    if (!this.recibo || this.recibo.id !== id || this.recibo.importacionId !== importacionId) return null;
    return this.recibo;
  }

  async findAllByEmpresa(): Promise<Recibo[]> {
    throw new Error('no usado en este test');
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

class AuditLogRepositoryFake implements AuditLogRepository {
  entradas: AuditLogEntry[] = [];
  entidadConsultada: { entidad: string; entidadId: string } | null = null;

  async findByEntidad(entidad: string, entidadId: string): Promise<AuditLogEntry[]> {
    this.entidadConsultada = { entidad, entidadId };
    return this.entradas;
  }
}

function snapshot(): ReciboSnapshot {
  return {
    empresa: { razonSocial: 'Acme SA', cuit: '20-12345678-6', domicilio: null, localidad: null, provincia: null, codigoPostal: null },
    empleado: { nombre: 'Juan', apellido: 'Perez', cuil: '27-30987654-2', categoria: null, fechaIngreso: null, antiguedad: '—', legajo: null, banco: null },
    periodo: { anio: 2026, mes: 8, fechaPago: '2026-08-05', lugarPago: 'CABA', fechaPagoCargasSociales: '2026-08-10', lugarPagoCargasSociales: 'CABA' },
    conceptos: [],
    totales: { totalBruto: 1000, totalDeducciones: 0, totalContribucionesPatronales: 0, neto: 1000, costoLaboralTotal: 1000 },
    segmentosCostoLaboral: [],
    detalleComposicionSalarial: [],
  };
}

describe('ListarAuditoriaReciboUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let reciboRepository: ReciboRepositoryFake;
  let auditLogRepository: AuditLogRepositoryFake;
  let useCase: ListarAuditoriaReciboUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    reciboRepository = new ReciboRepositoryFake();
    auditLogRepository = new AuditLogRepositoryFake();
    useCase = new ListarAuditoriaReciboUseCase(empresaRepository, importacionRepository, reciboRepository, auditLogRepository);

    importacionRepository.importacion = Importacion.create({
      id: IMPORTACION_ID,
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      anio: 2026,
      mes: 8,
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

    reciboRepository.recibo = Recibo.create({
      id: RECIBO_ID,
      importacionId: IMPORTACION_ID,
      empleadoId: 'empleado-juan',
      numero: 1,
      snapshot: snapshot(),
      pdfPath: `${RECIBO_ID}.pdf`,
      hashIntegridad: 'hash-1',
      fechaEmision: new Date('2026-08-01'),
    });
  });

  it('consulta el AuditLog por entidad "Recibo" y el id del recibo', async () => {
    auditLogRepository.entradas = [
      { id: 'log-1', timestamp: new Date('2026-08-01'), entidad: 'Recibo', entidadId: RECIBO_ID, accion: 'emitir', campo: null, valorAnterior: null, valorNuevo: null, usuarioId: USUARIO_ID },
    ];

    const entradas = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      reciboId: RECIBO_ID,
    });

    expect(auditLogRepository.entidadConsultada).toEqual({ entidad: 'Recibo', entidadId: RECIBO_ID });
    expect(entradas).toHaveLength(1);
    expect(entradas[0].accion).toBe('emitir');
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: RECIBO_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la importación no existe', async () => {
    importacionRepository.importacion = null;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: RECIBO_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si el recibo no existe en esa importación', async () => {
    reciboRepository.recibo = null;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID, reciboId: RECIBO_ID }),
    ).rejects.toThrow(NotFoundError);
  });
});
