import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { CorregirFilaImportacionUseCase } from '../../src/modules/importacion/application/corregir-fila-importacion.use-case';
import { ImportacionFila, ImportacionFilaProps } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ActualizarFilaData, ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';
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

  async actualizarFila(filaId: string, data: ActualizarFilaData): Promise<Importacion> {
    if (!this.importacion) throw new Error('no hay importación cargada en el fake');

    const filas = this.importacion.filas.map((fila) =>
      fila.id === filaId
        ? ImportacionFila.create({
            id: fila.id,
            numeroFila: fila.numeroFila,
            cuil: data.cuil,
            nombre: data.nombre,
            apellido: data.apellido,
            concepto: data.concepto,
            montoOriginal: data.montoOriginal,
            monto: data.monto,
            valida: data.valida,
            errorMensaje: data.errorMensaje,
            unidad: data.unidad,
            base: data.base,
            correcciones: data.correcciones,
          })
        : fila,
    );

    this.importacion = Importacion.create({ ...this.importacion, filas });
    return this.importacion;
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

  async actualizarDatosEmision(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }
}

function filaValida(overrides: Partial<ImportacionFilaProps> = {}): ImportacionFila {
  return ImportacionFila.create({
    id: 'fila-valida',
    numeroFila: 2,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Sueldo básico',
    montoOriginal: '1500.50',
    monto: 1500.5,
    valida: true,
    errorMensaje: null,
    ...overrides,
  });
}

function filaInvalida(overrides: Partial<ImportacionFilaProps> = {}): ImportacionFila {
  return ImportacionFila.create({
    id: 'fila-invalida',
    numeroFila: 3,
    cuil: '27309876540',
    nombre: 'Ana',
    apellido: 'Gomez',
    concepto: 'Antigüedad',
    montoOriginal: '300',
    monto: null,
    valida: false,
    errorMensaje: 'CUIL inválido: dígito verificador incorrecto ("27309876540")',
    ...overrides,
  });
}

function importacionBase(props: Partial<{ estado: 'previsualizada' | 'confirmada' }> = {}): Importacion {
  return Importacion.create({
    id: IMPORTACION_ID,
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 8,
    nombreArchivo: 'agosto.csv',
    estado: props.estado ?? 'previsualizada',
    fechaImportacion: new Date('2026-08-01'),
    filas: [filaValida(), filaInvalida()],
  });
}

describe('CorregirFilaImportacionUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let useCase: CorregirFilaImportacionUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    useCase = new CorregirFilaImportacionUseCase(empresaRepository, importacionRepository);
    importacionRepository.importacion = importacionBase();
  });

  it('corrige el CUIL de una fila inválida y la deja válida, sin tocar el resto de sus datos', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      filaId: 'fila-invalida',
      cambios: { cuil: '20123456786' },
    });

    const filaCorregida = resultado.filas.find((f) => f.id === 'fila-invalida')!;
    expect(filaCorregida.valida).toBe(true);
    expect(filaCorregida.cuil).toBe('20123456786');
    expect(filaCorregida.nombre).toBe('Ana');
    expect(filaCorregida.errorMensaje).toBeNull();
  });

  it('no toca las demás filas de la importación (revalidación incremental)', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      filaId: 'fila-invalida',
      cambios: { cuil: '20123456786' },
    });

    const otraFila = resultado.filas.find((f) => f.id === 'fila-valida')!;
    expect(otraFila.nombre).toBe('Juan');
    expect(otraFila.valida).toBe(true);
  });

  it('informa una corrección automática si el valor corregido todavía trae formato para limpiar', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      filaId: 'fila-invalida',
      cambios: { cuil: '20-12345678-6' },
    });

    const filaCorregida = resultado.filas.find((f) => f.id === 'fila-invalida')!;
    expect(filaCorregida.valida).toBe(true);
    expect(filaCorregida.correcciones.some((c) => c.startsWith('CUIL'))).toBe(true);
  });

  it('si la corrección sigue siendo inválida, la fila queda inválida con el mensaje de error nuevo', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      filaId: 'fila-invalida',
      cambios: { monto: 'todavia-no-es-un-numero' },
    });

    const filaCorregida = resultado.filas.find((f) => f.id === 'fila-invalida')!;
    expect(filaCorregida.valida).toBe(false);
    expect(filaCorregida.errorMensaje).toMatch(/CUIL inválido/);
  });

  it('mezcla solo los campos indicados, dejando el resto de la fila con su valor actual', async () => {
    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      importacionId: IMPORTACION_ID,
      filaId: 'fila-invalida',
      cambios: { apellido: 'Gómez' },
    });

    // El CUIL sigue mal (no se corrigió), así que la fila sigue inválida —
    // prueba de que el merge no perdió ni pisó los demás campos crudos.
    const importacionActualizada = await importacionRepository.findByIdAndEmpresa(IMPORTACION_ID, EMPRESA_ID);
    const filaCorregida = importacionActualizada!.filas.find((f) => f.id === 'fila-invalida')!;
    expect(filaCorregida.apellido).toBe('Gómez');
    expect(filaCorregida.valida).toBe(false);
  });

  it('rechaza si la importación no está en previsualización', async () => {
    importacionRepository.importacion = importacionBase({ estado: 'confirmada' });

    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        filaId: 'fila-invalida',
        cambios: { cuil: '20123456786' },
      }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si la fila no existe en esa importación', async () => {
    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        filaId: 'fila-inexistente',
        cambios: { cuil: '20123456786' },
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        importacionId: IMPORTACION_ID,
        filaId: 'fila-invalida',
        cambios: { cuil: '20123456786' },
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
