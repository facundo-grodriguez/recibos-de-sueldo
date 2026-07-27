import { beforeEach, describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/shared/errors/not-found-error';
import { ObtenerLogoEmpresaUseCase } from '../../src/modules/empresas/application/obtener-logo-empresa.use-case';
import { AlmacenamientoLogo } from '../../src/modules/empresas/domain/almacenamiento-logo';
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

  async actualizarLogo(): Promise<Empresa> {
    throw new Error('no usado en este test');
  }
}

class AlmacenamientoLogoFake implements AlmacenamientoLogo {
  archivos = new Map<string, Buffer>();

  async guardar(): Promise<string> {
    throw new Error('no usado en este test');
  }

  async leer(logoPath: string): Promise<Buffer> {
    const contenido = this.archivos.get(logoPath);
    if (!contenido) throw new Error(`archivo no encontrado en el fake: ${logoPath}`);
    return contenido;
  }
}

describe('ObtenerLogoEmpresaUseCase', () => {
  let empresaRepository: EmpresaRepositoryFake;
  let almacenamiento: AlmacenamientoLogoFake;
  let useCase: ObtenerLogoEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new EmpresaRepositoryFake();
    almacenamiento = new AlmacenamientoLogoFake();
    useCase = new ObtenerLogoEmpresaUseCase(empresaRepository, almacenamiento);
  });

  it('devuelve el contenido y el mime type correcto según la extensión guardada', async () => {
    empresaRepository.empresa = Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
      logoPath: `${EMPRESA_ID}.png`,
    });
    almacenamiento.archivos.set(`${EMPRESA_ID}.png`, Buffer.from('fake-png'));

    const resultado = await useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID });

    expect(resultado.contenido.toString()).toBe('fake-png');
    expect(resultado.mimeType).toBe('image/png');
  });

  it('rechaza si la empresa todavía no tiene logo cargado', async () => {
    empresaRepository.empresa = Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
    });

    await expect(useCase.execute({ empresaId: EMPRESA_ID, usuarioId: USUARIO_ID })).rejects.toThrow(NotFoundError);
  });

  it('rechaza si la empresa no pertenece al usuario', async () => {
    empresaRepository.empresa = Empresa.create({
      id: EMPRESA_ID,
      usuarioId: USUARIO_ID,
      razonSocial: 'Acme SA',
      cuit: '20123456786',
      logoPath: `${EMPRESA_ID}.png`,
    });

    await expect(useCase.execute({ empresaId: EMPRESA_ID, usuarioId: 'otro-usuario' })).rejects.toThrow(NotFoundError);
  });
});
