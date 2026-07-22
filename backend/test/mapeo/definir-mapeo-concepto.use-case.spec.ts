import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import {
  AuditLogEntry,
  AuditLogRepository,
  CrearAuditLogEntryData,
} from '../../src/infra/auditoria/audit-log.repository';
import { DefinirMapeoConceptoUseCase } from '../../src/modules/mapeo/application/definir-mapeo-concepto.use-case';
import { PerfilMapeoConcepto } from '../../src/modules/mapeo/domain/perfil-mapeo-concepto.entity';
import {
  DefinirMapeoData,
  PerfilMapeoRepository,
} from '../../src/modules/mapeo/domain/perfil-mapeo.repository';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../src/shared/utils/normalizar-concepto';
import {
  AplicarClasificacionData,
  ImportacionRepository,
} from '../../src/modules/importacion/domain/importacion.repository';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';

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

class PerfilMapeoRepositoryFake implements PerfilMapeoRepository {
  entradas: PerfilMapeoConcepto[] = [];

  async upsert(data: DefinirMapeoData): Promise<PerfilMapeoConcepto> {
    const existente = await this.findByEmpresaAndConceptoNormalizado(
      data.empresaId,
      normalizarConcepto(data.conceptoOriginal),
    );
    const perfil = PerfilMapeoConcepto.create({
      id: existente?.id ?? `perfil-${this.entradas.length + 1}`,
      empresaId: data.empresaId,
      conceptoOriginal: data.conceptoOriginal,
      clasificacion: ClasificacionConcepto.create(data.tipo, data.categoriaContribucion),
    });
    this.entradas = existente ? this.entradas.map((e) => (e.id === existente.id ? perfil : e)) : [...this.entradas, perfil];
    return perfil;
  }

  async findAllByEmpresa(): Promise<PerfilMapeoConcepto[]> {
    throw new Error('no usado en este test');
  }

  async findByEmpresaAndConceptoNormalizado(
    empresaId: string,
    conceptoNormalizado: string,
  ): Promise<PerfilMapeoConcepto | null> {
    return (
      this.entradas.find(
        (entrada) => entrada.empresaId === empresaId && entrada.conceptoNormalizado() === conceptoNormalizado,
      ) ?? null
    );
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<PerfilMapeoConcepto | null> {
    return this.entradas.find((entrada) => entrada.id === id && entrada.empresaId === empresaId) ?? null;
  }
}

class AuditLogRepositoryFake implements AuditLogRepository {
  entradas: CrearAuditLogEntryData[] = [];

  async create(data: CrearAuditLogEntryData): Promise<void> {
    this.entradas.push(data);
  }

  async findByEntidad(): Promise<AuditLogEntry[]> {
    throw new Error('no usado en este test');
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  llamadasAplicarClasificacion: Array<[string, string, AplicarClasificacionData]> = [];
  filasAActualizar = 3;

  async create(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(): Promise<Importacion[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(): Promise<Importacion | null> {
    throw new Error('no usado en este test');
  }

  async marcarConfirmada(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async actualizarFila(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async aplicarClasificacion(
    empresaId: string,
    conceptoNormalizado: string,
    clasificacion: AplicarClasificacionData,
  ): Promise<number> {
    this.llamadasAplicarClasificacion.push([empresaId, conceptoNormalizado, clasificacion]);
    return this.filasAActualizar;
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

describe('DefinirMapeoConceptoUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let perfilMapeoRepository: PerfilMapeoRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let auditLogRepository: AuditLogRepositoryFake;
  let useCase: DefinirMapeoConceptoUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    perfilMapeoRepository = new PerfilMapeoRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    auditLogRepository = new AuditLogRepositoryFake();
    useCase = new DefinirMapeoConceptoUseCase(
      empresaRepository,
      perfilMapeoRepository,
      importacionRepository,
      auditLogRepository,
    );
  });

  it('define un mapeo nuevo y aplica el backfill retroactivo', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      concepto: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    expect(resultado.perfil.conceptoOriginal).toBe('Sueldo Básico');
    expect(resultado.filasActualizadas).toBe(3);
    expect(importacionRepository.llamadasAplicarClasificacion).toEqual([
      [EMPRESA_ID, 'sueldo básico', { tipo: 'remunerativo', categoriaContribucion: null }],
    ]);
  });

  it('registra una auditoría "crear" con valorAnterior nulo la primera vez que se mapea un concepto', async () => {
    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      concepto: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    expect(auditLogRepository.entradas).toHaveLength(1);
    expect(auditLogRepository.entradas[0]).toMatchObject({
      entidad: 'PerfilMapeoConcepto',
      accion: 'crear',
      usuarioId: USUARIO_ID,
      campo: 'clasificacion',
      valorAnterior: null,
      valorNuevo: JSON.stringify({ tipo: 'remunerativo', categoriaContribucion: null }),
    });
  });

  it('registra una auditoría "modificar" con el valor anterior cuando se redefine un concepto ya mapeado', async () => {
    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      concepto: 'ART',
      tipo: 'contribucion_patronal',
      categoriaContribucion: 'art',
    });

    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      concepto: 'ART',
      tipo: 'deduccion',
      categoriaContribucion: 'art',
    });

    expect(auditLogRepository.entradas).toHaveLength(2);
    expect(auditLogRepository.entradas[1]).toMatchObject({
      accion: 'modificar',
      valorAnterior: JSON.stringify({ tipo: 'contribucion_patronal', categoriaContribucion: 'art' }),
      valorNuevo: JSON.stringify({ tipo: 'deduccion', categoriaContribucion: 'art' }),
    });
  });

  it('no registra auditoría si se reenvía exactamente la misma clasificación (sin cambio real)', async () => {
    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      concepto: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      concepto: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    expect(auditLogRepository.entradas).toHaveLength(1);
  });

  it('rechaza una contribución patronal sin categoría, sin persistir nada', async () => {
    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        concepto: 'ART',
        tipo: 'contribucion_patronal',
        categoriaContribucion: null,
      }),
    ).rejects.toThrow(DomainError);

    expect(perfilMapeoRepository.entradas).toHaveLength(0);
    expect(importacionRepository.llamadasAplicarClasificacion).toHaveLength(0);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        concepto: 'Sueldo Básico',
        tipo: 'remunerativo',
        categoriaContribucion: null,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
