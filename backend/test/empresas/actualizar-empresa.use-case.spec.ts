import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ActualizarEmpresaUseCase } from '../../src/modules/empresas/application/actualizar-empresa.use-case';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { ActualizarEmpresaData, EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';

class EmpresaRepositoryFake implements EmpresaRepository {
  empresa: Empresa | null = null;
  ultimaActualizacion: ActualizarEmpresaData | null = null;

  async create(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }

  async findAllByUsuario(): Promise<Empresa[]> {
    throw new Error('no usado en este test');
  }

  async findByIdAndUsuario(id: string, usuarioId: string): Promise<Empresa | null> {
    if (!this.empresa || this.empresa.id !== id || this.empresa.usuarioId !== usuarioId) return null;
    return this.empresa;
  }

  async actualizar(id: string, data: ActualizarEmpresaData): Promise<Empresa> {
    if (!this.empresa || this.empresa.id !== id) {
      throw new Error('empresa no encontrada en el fake');
    }
    this.ultimaActualizacion = data;
    this.empresa = Empresa.create({
      id: this.empresa.id,
      usuarioId: this.empresa.usuarioId,
      razonSocial: data.razonSocial ?? this.empresa.razonSocial,
      cuit: data.cuit ?? this.empresa.cuit.value,
      nombreFantasia: data.nombreFantasia ?? this.empresa.nombreFantasia,
      domicilio: data.domicilio ?? this.empresa.domicilio,
      localidad: data.localidad ?? this.empresa.localidad,
      provincia: data.provincia ?? this.empresa.provincia,
      codigoPostal: data.codigoPostal ?? this.empresa.codigoPostal,
    });
    return this.empresa;
  }

  async actualizarLogo(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }
}

describe('ActualizarEmpresaUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let useCase: ActualizarEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    empresaRepository.empresa = Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
    });
    useCase = new ActualizarEmpresaUseCase(empresaRepository);
  });

  it('actualiza la razón social', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme Sociedad Anónima',
    });

    expect(resultado.razonSocial).toBe('Acme Sociedad Anónima');
  });

  it('actualiza domicilio, localidad, provincia y código postal juntos', async () => {
    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      domicilio: 'Av. Siempre Viva 123',
      localidad: 'CABA',
      provincia: 'Buenos Aires',
      codigoPostal: '1000',
    });

    expect(resultado.domicilio).toBe('Av. Siempre Viva 123');
    expect(resultado.localidad).toBe('CABA');
    expect(resultado.provincia).toBe('Buenos Aires');
    expect(resultado.codigoPostal).toBe('1000');
  });

  it('no toca los campos que no vienen en la corrección', async () => {
    await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID, nombreFantasia: 'Acme' });

    expect(empresaRepository.empresa?.razonSocial).toBe('Acme SA');
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: 'otro-usuario', razonSocial: 'Otro nombre' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la empresa no existe', async () => {
    await expect(
      useCase.execute({ empresaId: 'empresa-inexistente', usuarioId: USUARIO_ID, razonSocial: 'Otro nombre' }),
    ).rejects.toThrow(NotFoundError);
  });
});
