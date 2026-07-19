import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { DefinirMapeoConceptoUseCase } from '../../src/modules/mapeo/application/definir-mapeo-concepto.use-case';
import { PerfilMapeoConcepto } from '../../src/modules/mapeo/domain/perfil-mapeo-concepto.entity';
import {
  DefinirMapeoData,
  PerfilMapeoRepository,
} from '../../src/modules/mapeo/domain/perfil-mapeo.repository';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
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
    const perfil = PerfilMapeoConcepto.create({
      id: `perfil-${this.entradas.length + 1}`,
      empresaId: data.empresaId,
      conceptoOriginal: data.conceptoOriginal,
      clasificacion: ClasificacionConcepto.create(data.tipo, data.categoriaContribucion),
    });
    this.entradas.push(perfil);
    return perfil;
  }

  async findAllByEmpresa(): Promise<PerfilMapeoConcepto[]> {
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

  async findConfirmadasAnteriores(): Promise<Importacion[]> {
    throw new Error('no usado en este test');
  }

  async actualizarDatosEmision(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }
}

describe('DefinirMapeoConceptoUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let perfilMapeoRepository: PerfilMapeoRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let useCase: DefinirMapeoConceptoUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    perfilMapeoRepository = new PerfilMapeoRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    useCase = new DefinirMapeoConceptoUseCase(empresaRepository, perfilMapeoRepository, importacionRepository);
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
