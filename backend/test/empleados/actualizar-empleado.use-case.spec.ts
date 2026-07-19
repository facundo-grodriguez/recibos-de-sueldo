import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ActualizarEmpleadoUseCase } from '../../src/modules/empleados/application/actualizar-empleado.use-case';
import { Empleado } from '../../src/modules/empleados/domain/empleado.entity';
import { ActualizarEmpleadoData, EmpleadoRepository } from '../../src/modules/empleados/domain/empleado.repository';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';
const EMPLEADO_ID = 'empleado-1';

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

class EmpleadoRepositoryFake implements EmpleadoRepository {
  empleado: Empleado | null = null;
  ultimaActualizacion: ActualizarEmpleadoData | null = null;

  async create(): Promise<Empleado> {
    throw new Error('no usado en este test');
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

  async findAllByCuilsAndEmpresa(): Promise<Empleado[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndEmpresa(id: string, empresaId: string): Promise<Empleado | null> {
    if (!this.empleado || this.empleado.id !== id || this.empleado.empresaId !== empresaId) return null;
    return this.empleado;
  }

  async actualizar(id: string, data: ActualizarEmpleadoData): Promise<Empleado> {
    if (!this.empleado || this.empleado.id !== id) {
      throw new Error('empleado no encontrado en el fake');
    }
    this.ultimaActualizacion = data;
    this.empleado = Empleado.create({
      id: this.empleado.id,
      empresaId: this.empleado.empresaId,
      nombre: this.empleado.nombre,
      apellido: this.empleado.apellido,
      cuil: this.empleado.cuil.value,
      estado: this.empleado.estado,
      categoria: data.categoria ?? this.empleado.categoria,
      fechaIngreso: data.fechaIngreso ?? this.empleado.fechaIngreso,
      legajo: data.legajo ?? this.empleado.legajo,
      banco: data.banco ?? this.empleado.banco,
    });
    return this.empleado;
  }
}

describe('ActualizarEmpleadoUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let empleadoRepository: EmpleadoRepositoryFake;
  let useCase: ActualizarEmpleadoUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    empleadoRepository = new EmpleadoRepositoryFake();
    empleadoRepository.empleado = Empleado.create({
      id: EMPLEADO_ID,
      empresaId: EMPRESA_ID,
      nombre: 'Juan',
      apellido: 'Perez',
      cuil: '27309876542',
      estado: 'activo',
    });
    useCase = new ActualizarEmpleadoUseCase(empresaRepository, empleadoRepository);
  });

  it('actualiza categoría y fecha de ingreso', async () => {
    const fechaIngreso = new Date('2024-01-10');

    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      empleadoId: EMPLEADO_ID,
      categoria: 'Administrativo A',
      fechaIngreso,
    });

    expect(resultado.categoria).toBe('Administrativo A');
    expect(resultado.fechaIngreso).toEqual(fechaIngreso);
  });

  it('actualiza el legajo', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      empleadoId: EMPLEADO_ID,
      legajo: '21',
    });

    expect(resultado.legajo).toBe('21');
  });

  it('actualiza el banco', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      empleadoId: EMPLEADO_ID,
      banco: 'Banco Nación',
    });

    expect(resultado.banco).toBe('Banco Nación');
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.visible = false;

    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, empleadoId: EMPLEADO_ID }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si el empleado no pertenece a la empresa', async () => {
    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, empleadoId: 'otro-empleado' }),
    ).rejects.toThrow(NotFoundError);
  });
});
