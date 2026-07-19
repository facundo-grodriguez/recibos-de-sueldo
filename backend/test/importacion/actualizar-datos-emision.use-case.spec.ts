import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ActualizarDatosEmisionUseCase } from '../../src/modules/importacion/application/actualizar-datos-emision.use-case';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ActualizarDatosEmisionData, ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';

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

function importacionBase(): Importacion {
  return Importacion.create({
    id: IMPORTACION_ID,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 7,
    nombreArchivo: 'julio.csv',
    estado: 'previsualizada',
    fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
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

class ImportacionRepositoryFake implements ImportacionRepository {
  importacion: Importacion | null = null;
  ultimaActualizacion: ActualizarDatosEmisionData | null = null;

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

  async actualizarDatosEmision(id: string, data: ActualizarDatosEmisionData): Promise<Importacion> {
    if (!this.importacion || this.importacion.id !== id) {
      throw new Error('importación no encontrada en el fake');
    }
    this.ultimaActualizacion = data;
    this.importacion = Importacion.create({
      ...this.importacion,
      fechaPago: data.fechaPago ?? this.importacion.fechaPago,
      lugarPago: data.lugarPago ?? this.importacion.lugarPago,
      fechaPagoCargasSociales: data.fechaPagoCargasSociales ?? this.importacion.fechaPagoCargasSociales,
      lugarPagoCargasSociales: data.lugarPagoCargasSociales ?? this.importacion.lugarPagoCargasSociales,
    });
    return this.importacion;
  }
}

describe('ActualizarDatosEmisionUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let useCase: ActualizarDatosEmisionUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    importacionRepository.importacion = importacionBase();
    useCase = new ActualizarDatosEmisionUseCase(empresaRepository, importacionRepository);
  });

  it('completa los 4 datos de emisión', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      fechaPago: new Date('2026-07-05'),
      lugarPago: 'CABA',
      fechaPagoCargasSociales: new Date('2026-07-10'),
      lugarPagoCargasSociales: 'CABA',
    });

    expect(resultado.tieneDatosDeEmisionCompletos()).toBe(true);
  });

  it('permite completar los datos de a uno sin pisar los ya cargados', async () => {
    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      fechaPago: new Date('2026-07-05'),
      lugarPago: 'CABA',
    });

    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      fechaPagoCargasSociales: new Date('2026-07-10'),
      lugarPagoCargasSociales: 'CABA',
    });

    expect(resultado.fechaPago).toEqual(new Date('2026-07-05'));
    expect(resultado.tieneDatosDeEmisionCompletos()).toBe(true);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: IMPORTACION_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la importación no pertenece a la empresa', async () => {
    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, importacionId: 'otra' }),
    ).rejects.toThrow(NotFoundError);
  });
});
