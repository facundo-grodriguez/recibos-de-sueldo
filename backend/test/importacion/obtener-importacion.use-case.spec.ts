import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ObtenerImportacionUseCase } from '../../src/modules/importacion/application/obtener-importacion.use-case';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { ConceptoCatalogo } from '../../src/modules/catalogo-conceptos/domain/concepto-catalogo.entity';
import {
  DefinirConceptoCatalogoData,
  ConceptoCatalogoRepository,
} from '../../src/modules/catalogo-conceptos/domain/concepto-catalogo.repository';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';

class EmpresaRepositoryFake implements EmpresaRepository {
  async create(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }

  async findAllByUsuario(): Promise<Empresa[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndUsuario(id: string, usuarioId: string): Promise<Empresa | null> {
    if (id !== EMPRESA_ID || usuarioId !== USUARIO_ID) return null;
    return Empresa.create({ id: EMPRESA_ID, usuarioId: USUARIO_ID, razonSocial: 'Acme SA', cuit: '20123456786' });
  }

  async actualizar(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  importacion: Importacion | null = null;
  hayOtra = false;

  async create(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(): Promise<Importacion[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Importacion | null> {
    if (!this.importacion || this.importacion.id !== id || this.importacion.empresaId !== empresaId) return null;
    return this.importacion;
  }

  async marcarConfirmada(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async actualizarFila(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async actualizarDatosEmision(): Promise<Importacion> {
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
    return this.hayOtra;
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

function importacion(id: string): Importacion {
  return Importacion.create({
    id,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 8,
    nombreArchivo: 'agosto.xlsx',
    estado: 'previsualizada',
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

describe('ObtenerImportacionUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let catalogoConceptosRepository: ConceptoCatalogoRepositoryFake;
  let useCase: ObtenerImportacionUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    importacionRepository.importacion = importacion('i1');
    catalogoConceptosRepository = new ConceptoCatalogoRepositoryFake();
    useCase = new ObtenerImportacionUseCase(empresaRepository, importacionRepository, catalogoConceptosRepository);
  });

  it('devuelve hayOtraImportacionEnMismoPeriodo en false cuando no hay otra (Etapa 3)', async () => {
    importacionRepository.hayOtra = false;

    const resultado = await useCase.execute({ importacionId: 'i1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado.importacion.id).toBe('i1');
    expect(resultado.hayOtraImportacionEnMismoPeriodo).toBe(false);
  });

  it('devuelve hayOtraImportacionEnMismoPeriodo en true cuando el repositorio encuentra otra (Etapa 3)', async () => {
    importacionRepository.hayOtra = true;

    const resultado = await useCase.execute({ importacionId: 'i1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado.hayOtraImportacionEnMismoPeriodo).toBe(true);
  });

  it('incluye en conceptosCatalogados los conceptos (normalizados) ya definidos en el catálogo de la empresa', async () => {
    await catalogoConceptosRepository.upsert({
      empresaId: EMPRESA_ID,
      conceptoOriginal: 'Sueldo Básico',
      tipo: 'remunerativo',
      categoriaContribucion: null,
    });

    const resultado = await useCase.execute({ importacionId: 'i1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado.conceptosCatalogados.has('sueldo básico')).toBe(true);
  });

  it('devuelve conceptosCatalogados vacío si el catálogo de la empresa no tiene nada definido', async () => {
    const resultado = await useCase.execute({ importacionId: 'i1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado.conceptosCatalogados.size).toBe(0);
  });

  it('rechaza si la importación no pertenece a la empresa', async () => {
    await expect(
      useCase.execute({ importacionId: 'inexistente', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(NotFoundError);
  });
});
