import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ListarImportacionesUseCase } from '../../src/modules/importacion/application/listar-importaciones.use-case';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';
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
    return Empresa.create({ id: EMPRESA_ID, usuarioId: USUARIO_ID, razonSocial: 'Acme SA', cuit: '20123456786' });
  }

  async actualizar(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  importaciones: Importacion[] = [];

  async create(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(empresaId: string): Promise<Importacion[]> {
    return this.importaciones.filter((i) => i.empresaId === empresaId);
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
    return false;
  }
}

function importacion(props: { id: string; empresaId: string; estado?: 'previsualizada' | 'confirmada' }): Importacion {
  return Importacion.create({
    id: props.id,
    empresaId: props.empresaId,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 8,
    nombreArchivo: 'agosto.csv',
    estado: props.estado ?? 'previsualizada',
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

describe('ListarImportacionesUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let useCase: ListarImportacionesUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    useCase = new ListarImportacionesUseCase(empresaRepository, importacionRepository);

    importacionRepository.importaciones = [
      importacion({ id: 'i1', empresaId: EMPRESA_ID, estado: 'confirmada' }),
      importacion({ id: 'i2', empresaId: EMPRESA_ID }),
      importacion({ id: 'i3', empresaId: 'otra-empresa' }),
    ];
  });

  it('devuelve solo las importaciones de la empresa indicada, sin importar el estado', async () => {
    const resultado = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado.map((i) => i.id).sort()).toEqual(['i1', 'i2']);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID })).rejects.toThrow(NotFoundError);
  });
});
