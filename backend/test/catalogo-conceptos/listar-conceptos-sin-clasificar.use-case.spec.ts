import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ListarConceptosSinClasificarUseCase } from '../../src/modules/catalogo-conceptos/application/listar-conceptos-sin-clasificar.use-case';
import { ConceptoCatalogo } from '../../src/modules/catalogo-conceptos/domain/concepto-catalogo.entity';
import {
  DefinirConceptoCatalogoData,
  ConceptoCatalogoRepository,
} from '../../src/modules/catalogo-conceptos/domain/concepto-catalogo.repository';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';
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

class ConceptoCatalogoRepositoryFake implements ConceptoCatalogoRepository {
  entradas: ConceptoCatalogo[] = [];

  async upsert(data: DefinirConceptoCatalogoData): Promise<ConceptoCatalogo> {
    const concepto = ConceptoCatalogo.create({
      id: `concepto-${this.entradas.length + 1}`,
      empresaId: data.empresaId,
      conceptoOriginal: data.conceptoOriginal,
      clasificacion: ClasificacionConcepto.create(data.tipo, data.categoriaContribucion),
    });
    this.entradas = [...this.entradas, concepto];
    return concepto;
  }

  async findAllByEmpresa(empresaId: string): Promise<ConceptoCatalogo[]> {
    return this.entradas.filter((entrada) => entrada.empresaId === empresaId);
  }

  async findByEmpresaAndConceptoNormalizado(
    empresaId: string,
    conceptoNormalizado: string,
  ): Promise<ConceptoCatalogo | null> {
    return (
      this.entradas.find(
        (entrada) => entrada.empresaId === empresaId && entrada.conceptoNormalizado() === conceptoNormalizado,
      ) ?? null
    );
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<ConceptoCatalogo | null> {
    return this.entradas.find((entrada) => entrada.id === id && entrada.empresaId === empresaId) ?? null;
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  conceptosPendientes: string[] = [];

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

  async aplicarClasificacion(): Promise<number> {
    throw new Error('no usado en este test');
  }

  async listarConceptosPendientes(): Promise<string[]> {
    return this.conceptosPendientes;
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

describe('ListarConceptosSinClasificarUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let catalogoConceptosRepository: ConceptoCatalogoRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let useCase: ListarConceptosSinClasificarUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    catalogoConceptosRepository = new ConceptoCatalogoRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    useCase = new ListarConceptosSinClasificarUseCase(empresaRepository, importacionRepository, catalogoConceptosRepository);
  });

  it('excluye los conceptos que ya están en el catálogo de la empresa, aunque la fila de la nueva importación todavía diga null', async () => {
    importacionRepository.conceptosPendientes = ['Sueldo Básico', 'Presentismo'];
    await catalogoConceptosRepository.upsert({
      empresaId: EMPRESA_ID,
      conceptoOriginal: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toEqual(['Presentismo']);
  });

  it('matchea por concepto normalizado, no por texto exacto', async () => {
    importacionRepository.conceptosPendientes = ['  sueldo básico  '];
    await catalogoConceptosRepository.upsert({
      empresaId: EMPRESA_ID,
      conceptoOriginal: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toEqual([]);
  });

  it('devuelve todos los pendientes si el catálogo de la empresa está vacío', async () => {
    importacionRepository.conceptosPendientes = ['Sueldo Básico', 'Presentismo'];

    const resultado = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado).toEqual(['Sueldo Básico', 'Presentismo']);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID })).rejects.toThrow(NotFoundError);
  });
});
