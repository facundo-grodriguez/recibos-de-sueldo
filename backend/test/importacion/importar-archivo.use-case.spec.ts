import { beforeEach, describe, expect, it } from 'vitest';
import { ImportarArchivoUseCase } from '../../src/modules/importacion/application/importar-archivo.use-case';
import { ConectorImportacion, ResultadoParseoConector } from '../../src/modules/importacion/domain/conector-importacion';
import { FilaCanonica } from '../../src/modules/importacion/domain/fila-canonica';
import { Importacion } from '../../src/modules/importacion/domain/importacion.entity';
import { ImportacionFila } from '../../src/modules/importacion/domain/importacion-fila.entity';
import { CrearImportacionData, ImportacionRepository } from '../../src/modules/importacion/domain/importacion.repository';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';
import { Empleado } from '../../src/modules/empleados/domain/empleado.entity';
import { CrearEmpleadoData, EmpleadoRepository } from '../../src/modules/empleados/domain/empleado.repository';

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
  ultimoCreate?: CrearImportacionData;

  async create(data: CrearImportacionData): Promise<Importacion> {
    this.ultimoCreate = data;
    return Importacion.create({
      id: 'importacion-1',
      empresaId: data.empresaId,
      usuarioId: data.usuarioId,
      anio: data.anio,
      mes: data.mes,
      nombreArchivo: data.nombreArchivo,
      estado: 'previsualizada',
      fechaImportacion: new Date(),
      filas: data.filas.map((fila, indice) =>
        ImportacionFila.create({
          id: `fila-${indice + 1}`,
          ...fila,
        }),
      ),
    });
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

  async crearVarios(): Promise<void> {
    throw new Error('no usado en este test');
  }
  async findAllByEmpresa(): Promise<Empleado[]> {
    throw new Error('no usado en este test');
  }
  async findByCuilAndEmpresa(): Promise<Empleado | null> {
    throw new Error('no usado en este test');
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

class ConectorImportacionFake implements ConectorImportacion {
  resultado: ResultadoParseoConector = { filas: [], correcciones: [] };

  async parse(): Promise<ResultadoParseoConector> {
    return this.resultado;
  }
}

function filaCanonica(overrides: Partial<FilaCanonica>): FilaCanonica {
  return {
    numeroFila: 2,
    cuil: '27309876542',
    nombre: 'Juan',
    apellido: 'Perez',
    concepto: 'Sueldo básico',
    monto: '1500',
    ...overrides,
  };
}

describe('ImportarArchivoUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let importacionRepository: ImportacionRepositoryFake;
  let conectorExcel: ConectorImportacionFake;
  let empleadoRepository: EmpleadoRepositoryFake;
  let useCase: ImportarArchivoUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    importacionRepository = new ImportacionRepositoryFake();
    conectorExcel = new ConectorImportacionFake();
    empleadoRepository = new EmpleadoRepositoryFake();
    useCase = new ImportarArchivoUseCase(empresaRepository, importacionRepository, conectorExcel, empleadoRepository);
  });

  it('no agrega ninguna corrección cuando el adaptador no reportó ninguna', async () => {
    conectorExcel.resultado = { filas: [filaCanonica({})], correcciones: [] };

    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      anio: 2026,
      mes: 7,
      nombreArchivo: 'liquidacion.xlsx',
      contenido: Buffer.from(''),
    });

    expect(importacionRepository.ultimoCreate?.filas[0].correcciones).toEqual([]);
  });

  it('fusiona la corrección del adaptador (ej. herencia de fila) con las de validación, en la fila correcta', async () => {
    conectorExcel.resultado = {
      filas: [
        filaCanonica({ numeroFila: 2, cuil: '27-30987654-2' }), // fuerza una corrección de formato en validarFilaImportacion
        filaCanonica({ numeroFila: 3, concepto: 'Antigüedad', monto: '300' }),
      ],
      correcciones: [{ numeroFila: 3, mensaje: 'CUIL, nombre y apellido heredados de la fila 2' }],
    };

    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      anio: 2026,
      mes: 7,
      nombreArchivo: 'liquidacion.xlsx',
      contenido: Buffer.from(''),
    });

    const filas = importacionRepository.ultimoCreate!.filas;
    expect(filas[0].correcciones).toEqual(['CUIL: se normalizó quitando espacios, guiones o puntos']);
    expect(filas[1].correcciones).toEqual(['CUIL, nombre y apellido heredados de la fila 2']);
  });

  it('adjunta la corrección del adaptador también en una fila que resulta inválida por otro motivo', async () => {
    conectorExcel.resultado = {
      filas: [filaCanonica({ numeroFila: 3, concepto: '' })], // concepto vacío -> fila inválida
      correcciones: [{ numeroFila: 3, mensaje: 'CUIL, nombre y apellido heredados de la fila 2' }],
    };

    await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      anio: 2026,
      mes: 7,
      nombreArchivo: 'liquidacion.xlsx',
      contenido: Buffer.from(''),
    });

    const fila = importacionRepository.ultimoCreate!.filas[0];
    expect(fila.valida).toBe(false);
    expect(fila.correcciones).toEqual(['CUIL, nombre y apellido heredados de la fila 2']);
  });

  describe('reconocimiento de empleado (ADR-077/078)', () => {
    it('completa nombre y apellido faltantes desde un empleado ya registrado de la empresa', async () => {
      await empleadoRepository.create({ empresaId: EMPRESA_ID, nombre: 'Juan', apellido: 'Perez', cuil: '27309876542' });
      conectorExcel.resultado = {
        filas: [filaCanonica({ cuil: '27309876542', nombre: '', apellido: '' })],
        correcciones: [],
      };

      await useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'liquidacion.xlsx',
        contenido: Buffer.from(''),
      });

      const fila = importacionRepository.ultimoCreate!.filas[0];
      expect(fila.valida).toBe(true);
      expect(fila).toMatchObject({ nombre: 'Juan', apellido: 'Perez' });
      expect(fila.correcciones).toEqual(['Nombre y apellido completados desde el empleado ya registrado']);
    });

    it('avisa un conflicto de nombre sin modificar el dato del archivo (ADR-071)', async () => {
      await empleadoRepository.create({ empresaId: EMPRESA_ID, nombre: 'Juan', apellido: 'Perez', cuil: '27309876542' });
      conectorExcel.resultado = {
        filas: [filaCanonica({ cuil: '27309876542', nombre: 'Juancito', apellido: 'Perez' })],
        correcciones: [],
      };

      await useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'liquidacion.xlsx',
        contenido: Buffer.from(''),
      });

      const fila = importacionRepository.ultimoCreate!.filas[0];
      expect(fila.nombre).toBe('Juancito'); // se mantiene el del archivo, nunca se pisa
      expect(fila.correcciones).toEqual([
        'El nombre del archivo ("Juancito") difiere del registrado ("Juan"); se mantiene el del archivo',
      ]);
    });

    it('no reconoce nada para un CUIL que no corresponde a ningún empleado registrado (alta nueva)', async () => {
      conectorExcel.resultado = {
        filas: [filaCanonica({ cuil: '20300000003', nombre: 'Marcelo', apellido: 'Ibáñez' })],
        correcciones: [],
      };

      await useCase.execute({
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        anio: 2026,
        mes: 7,
        nombreArchivo: 'liquidacion.xlsx',
        contenido: Buffer.from(''),
      });

      const fila = importacionRepository.ultimoCreate!.filas[0];
      expect(fila).toMatchObject({ nombre: 'Marcelo', apellido: 'Ibáñez' });
      expect(fila.correcciones).toEqual([]);
    });
  });
});
