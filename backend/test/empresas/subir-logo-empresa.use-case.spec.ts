import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { SubirLogoEmpresaUseCase } from '../../src/modules/empresas/application/subir-logo-empresa.use-case';
import { AlmacenamientoLogo, GuardarLogoParams } from '../../src/modules/empresas/domain/almacenamiento-logo';
import { Empresa } from '../../src/modules/empresas/domain/empresa.entity';
import { EmpresaRepository } from '../../src/modules/empresas/domain/empresa.repository';

const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'usuario-1';

class EmpresaRepositoryFake implements EmpresaRepository {
  empresa: Empresa | null = null;

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

  async actualizar(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }

  async actualizarLogo(id: string, logoPath: string | null): Promise<Empresa> {
    if (!this.empresa || this.empresa.id !== id) {
      throw new Error('empresa no encontrada en el fake');
    }
    this.empresa = Empresa.create({
      id: this.empresa.id,
      usuarioId: this.empresa.usuarioId,
      razonSocial: this.empresa.razonSocial,
      cuit: this.empresa.cuit.value,
      logoPath,
    });
    return this.empresa;
  }
}

class AlmacenamientoLogoFake implements AlmacenamientoLogo {
  guardados: GuardarLogoParams[] = [];

  async guardar(params: GuardarLogoParams): Promise<string> {
    this.guardados.push(params);
    return `${params.empresaId}.${params.extension}`;
  }

  async leer(): Promise<Buffer> {
    throw new Error('no usado en este test');
  }
}

describe('SubirLogoEmpresaUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let almacenamiento: AlmacenamientoLogoFake;
  let useCase: SubirLogoEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    empresaRepository.empresa = Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
    });
    almacenamiento = new AlmacenamientoLogoFake();
    useCase = new SubirLogoEmpresaUseCase(empresaRepository, almacenamiento);
  });

  it('guarda el archivo y actualiza logoPath de la empresa', async () => {
    const contenido = Buffer.from('fake-png');

    const resultado = await useCase.execute({
      empresaId: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      extension: 'png',
      contenido,
    });

    expect(almacenamiento.guardados).toEqual([{ empresaId: EMPRESA_ID, extension: 'png', contenido }]);
    expect(resultado.logoPath).toBe(`${EMPRESA_ID}.png`);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    await expect(
      useCase.execute({ empresaId: EMPRESA_ID, usuarioId: 'otro-usuario', extension: 'png', contenido: Buffer.from('x') }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la empresa no existe', async () => {
    await expect(
      useCase.execute({ empresaId: 'no-existe', usuarioId: USUARIO_ID, extension: 'png', contenido: Buffer.from('x') }),
    ).rejects.toThrow(NotFoundError);
  });
});
