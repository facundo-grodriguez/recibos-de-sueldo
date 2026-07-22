import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ConfirmarImportacionUseCase } from '../../src/modules/importacion/application/confirmar-importacion.use-case';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import {
  AplicarClasificacionData,
  ImportacionRepository,
} from '../../src/modules/importacion/domain/importacion.repository';
import { Empleado } from '../../src/modules/empleados/domain/empleado.entity';
import {
  CrearEmpleadoData,
  EmpleadoRepository,
} from '../../src/modules/empleados/domain/empleado.repository';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { PerfilMapeoConcepto } from '../../src/modules/mapeo/domain/perfil-mapeo-concepto.entity';
import {
  DefinirMapeoData,
  PerfilMapeoRepository,
} from '../../src/modules/mapeo/domain/perfil-mapeo.repository';
import { ClasificacionConcepto } from '../../src/shared/value-objects/clasificacion-concepto';
import { normalizarConcepto } from '../../src/shared/utils/normalizar-concepto';

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

class EmpleadoRepositoryFake implements EmpleadoRepository {
  empleados: Empleado[] = [];

  async create(data: CrearEmpleadoData): Promise<Empleado> {
    const empleado = Empleado.create({
      id: `empleado-${this.empleados.length + 1}`,
      empresaId: data.empresaId,
      nombre: data.nombre,
      apellido: data.apellido,
      cuil: data.cuil,
      estado: 'activo',
    });
    this.empleados.push(empleado);
    return empleado;
  }

  async crearVarios(datos: CrearEmpleadoData[]): Promise<void> {
    for (const dato of datos) {
      const yaExiste = this.empleados.some((e) => e.empresaId === dato.empresaId && e.cuil.value === dato.cuil);
      if (!yaExiste) {
        await this.create(dato);
      }
    }
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

  async findByIdAndEmpresa(): Promise<Empleado | null> {
    throw new Error('no usado en este test');
  }

  async actualizar(): Promise<Empleado> {
    throw new Error('no usado en este test');
  }
}

class PerfilMapeoRepositoryFake implements PerfilMapeoRepository {
  entradas: PerfilMapeoConcepto[] = [];

  seed(concepto: string, tipo: string, categoriaContribucion: string | null): void {
    this.entradas.push(
      PerfilMapeoConcepto.create({
        id: `perfil-${this.entradas.length + 1}`,
        empresaId: EMPRESA_ID,
        conceptoOriginal: concepto,
        clasificacion: ClasificacionConcepto.create(tipo, categoriaContribucion),
      }),
    );
  }

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

  async findAllByEmpresa(empresaId: string): Promise<PerfilMapeoConcepto[]> {
    return this.entradas.filter((entrada) => entrada.empresaId === empresaId);
  }

  async findByEmpresaAndConceptoNormalizado(): Promise<PerfilMapeoConcepto | null> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(): Promise<PerfilMapeoConcepto | null> {
    throw new Error('no usado en este test');
  }
}

class ImportacionRepositoryFake implements ImportacionRepository {
  private guardada: Importacion | null = null;

  seed(importacion: Importacion): void {
    this.guardada = importacion;
  }

  async create(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async findAllByEmpresa(): Promise<Importacion[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Importacion | null> {
    if (!this.guardada || this.guardada.id !== id || this.guardada.empresaId !== empresaId) {
      return null;
    }
    return this.guardada;
  }

  async marcarConfirmada(id: string): Promise<Importacion> {
    if (!this.guardada || this.guardada.id !== id) {
      throw new Error('importación no encontrada en el fake');
    }
    this.guardada = Importacion.create({ ...this.guardada, estado: 'confirmada' });
    return this.guardada;
  }

  async actualizarFila(): Promise<Importacion> {
    throw new Error('no usado en este test');
  }

  async aplicarClasificacion(
    empresaId: string,
    conceptoNormalizado: string,
    clasificacion: AplicarClasificacionData,
  ): Promise<number> {
    if (!this.guardada || this.guardada.empresaId !== empresaId) {
      return 0;
    }

    let actualizadas = 0;
    const filas = this.guardada.filas.map((fila) => {
      if (fila.valida && !fila.estaClasificada() && fila.conceptoNormalizado() === conceptoNormalizado) {
        actualizadas += 1;
        return ImportacionFila.create({
          id: fila.id,
          numeroFila: fila.numeroFila,
          cuil: fila.cuil,
          nombre: fila.nombre,
          apellido: fila.apellido,
          concepto: fila.concepto,
          montoOriginal: fila.montoOriginal,
          monto: fila.monto,
          valida: fila.valida,
          errorMensaje: fila.errorMensaje,
          clasificacion: ClasificacionConcepto.create(clasificacion.tipo, clasificacion.categoriaContribucion),
        });
      }
      return fila;
    });

    this.guardada = Importacion.create({ ...this.guardada, filas });
    return actualizadas;
  }

  async listarConceptosPendientes(): Promise<string[]> {
    throw new Error('no usado en este test');
  }

  async agruparFilasSinClasificarPorConcepto(empresaId: string): Promise<Map<string, string[]>> {
    if (!this.guardada || this.guardada.empresaId !== empresaId) {
      return new Map();
    }
    const idsPorConcepto = new Map<string, string[]>();
    for (const fila of this.guardada.filas) {
      if (!fila.valida || fila.estaClasificada()) continue;
      const clave = normalizarConcepto(fila.concepto);
      const ids = idsPorConcepto.get(clave) ?? [];
      ids.push(fila.id);
      idsPorConcepto.set(clave, ids);
    }
    return idsPorConcepto;
  }

  async actualizarClasificacionPorIds(ids: string[], clasificacion: AplicarClasificacionData): Promise<number> {
    if (!this.guardada) {
      return 0;
    }
    let actualizadas = 0;
    const filas = this.guardada.filas.map((fila) => {
      if (ids.includes(fila.id)) {
        actualizadas += 1;
        return ImportacionFila.create({
          id: fila.id,
          numeroFila: fila.numeroFila,
          cuil: fila.cuil,
          nombre: fila.nombre,
          apellido: fila.apellido,
          concepto: fila.concepto,
          montoOriginal: fila.montoOriginal,
          monto: fila.monto,
          valida: fila.valida,
          errorMensaje: fila.errorMensaje,
          clasificacion: ClasificacionConcepto.create(clasificacion.tipo, clasificacion.categoriaContribucion),
        });
      }
      return fila;
    });
    this.guardada = Importacion.create({ ...this.guardada, filas });
    return actualizadas;
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

function filaValida(
  overrides: Partial<{ id: string; numeroFila: number; cuil: string; concepto: string }> = {},
): ImportacionFila {
  return ImportacionFila.create({
    id: overrides.id ?? 'fila-1',
    numeroFila: overrides.numeroFila ?? 2,
    cuil: overrides.cuil ?? '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: overrides.concepto ?? 'Sueldo básico',
    montoOriginal: '1500',
    monto: 1500,
    valida: true,
    errorMensaje: null,
  });
}

function filaConError(): ImportacionFila {
  return ImportacionFila.create({
    id: 'fila-error',
    numeroFila: 3,
    cuil: 'invalido',
    nombre: 'Ana',
    apellido: 'Gomez',
    concepto: 'Sueldo básico',
    montoOriginal: 'x',
    monto: null,
    valida: false,
    errorMensaje: 'CUIL inválido',
  });
}

function importacionBase(props: Partial<{ estado: 'previsualizada' | 'confirmada'; filas: ImportacionFila[] }> = {}) {
  return Importacion.create({
    id: 'importacion-1',
    empresaId: EMPRESA_ID,
    usuarioId: USUARIO_ID,
    anio: 2026,
    mes: 7,
    nombreArchivo: 'julio.csv',
    estado: props.estado ?? 'previsualizada',
    fechaImportacion: new Date('2026-07-17T00:00:00.000Z'),
    filas: props.filas ?? [filaValida()],
  });
}

describe('ConfirmarImportacionUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let empleadoRepository: EmpleadoRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let perfilMapeoRepository: PerfilMapeoRepositoryFake;
  let useCase: ConfirmarImportacionUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    empleadoRepository = new EmpleadoRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    perfilMapeoRepository = new PerfilMapeoRepositoryFake();
    useCase = new ConfirmarImportacionUseCase(
      empresaRepository,
      importacionRepository,
      empleadoRepository,
      perfilMapeoRepository,
    );
  });

  it('confirma y crea un empleado nuevo por cada CUIL único', async () => {
    importacionRepository.seed(
      importacionBase({
        filas: [
          filaValida({ id: 'f1', numeroFila: 2, cuil: '27309876542' }),
          filaValida({ id: 'f2', numeroFila: 3, cuil: '20123456786' }),
        ],
      }),
    );

    const resultado = await useCase.execute({
      importacionId: 'importacion-1',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.estado).toBe('confirmada');
    expect(empleadoRepository.empleados).toHaveLength(2);
  });

  it('no duplica un empleado que ya existe', async () => {
    await empleadoRepository.create({
      empresaId: EMPRESA_ID,
      nombre: 'Juan',
      apellido: 'Perez',
      cuil: '27309876542',
    });

    importacionRepository.seed(
      importacionBase({
        filas: [
          filaValida({ id: 'f1', numeroFila: 2, cuil: '27309876542' }),
          filaValida({ id: 'f2', numeroFila: 3, cuil: '27309876542' }),
          filaValida({ id: 'f3', numeroFila: 4, cuil: '20123456786' }),
        ],
      }),
    );

    await useCase.execute({ importacionId: 'importacion-1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(empleadoRepository.empleados).toHaveLength(2);
  });

  it('rechaza confirmar si hay filas con error', async () => {
    importacionRepository.seed(importacionBase({ filas: [filaValida(), filaConError()] }));

    await expect(
      useCase.execute({ importacionId: 'importacion-1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza confirmar una importación ya confirmada', async () => {
    importacionRepository.seed(importacionBase({ estado: 'confirmada' }));

    await expect(
      useCase.execute({ importacionId: 'importacion-1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;
    importacionRepository.seed(importacionBase());

    await expect(
      useCase.execute({ importacionId: 'importacion-1', empresaId: EMPRESA_ID, usuarioId: USUARIO_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('clasifica automáticamente una fila cuyo concepto ya estaba mapeado', async () => {
    perfilMapeoRepository.seed('Sueldo básico', 'remunerativo', null);
    importacionRepository.seed(importacionBase({ filas: [filaValida({ concepto: 'Sueldo básico' })] }));

    const resultado = await useCase.execute({
      importacionId: 'importacion-1',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.filas[0].clasificacion?.tipo).toBe('remunerativo');
  });

  it('deja sin clasificar un concepto que la empresa nunca mapeó, sin bloquear la confirmación', async () => {
    importacionRepository.seed(importacionBase({ filas: [filaValida({ concepto: 'Concepto nuevo' })] }));

    const resultado = await useCase.execute({
      importacionId: 'importacion-1',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.estado).toBe('confirmada');
    expect(resultado.filas[0].clasificacion).toBeNull();
  });

  it('la clasificación matchea por concepto normalizado (mayús/minús y espacios)', async () => {
    perfilMapeoRepository.seed('  Sueldo Básico  ', 'remunerativo', null);
    expect(normalizarConcepto('  Sueldo Básico  ')).toBe(normalizarConcepto('sueldo básico'));

    importacionRepository.seed(importacionBase({ filas: [filaValida({ concepto: 'sueldo básico' })] }));

    const resultado = await useCase.execute({
      importacionId: 'importacion-1',
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
    });

    expect(resultado.filas[0].clasificacion?.tipo).toBe('remunerativo');
  });
});
