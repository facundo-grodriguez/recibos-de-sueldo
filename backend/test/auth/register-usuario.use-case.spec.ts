import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { RegisterUsuarioUseCase } from '../../src/modules/auth/application/register-usuario.use-case';
import { PasswordHasher } from '../../src/modules/auth/domain/password-hasher';
import { Usuario } from '../../src/modules/auth/domain/usuario.entity';
import { UsuarioRepository } from '../../src/modules/auth/domain/usuario.repository';

class UsuarioRepositoryFake implements UsuarioRepository {
  private usuarios: Array<{ usuario: Usuario; passwordHash: string }> = [];

  async findByEmail(email: string) {
    return this.usuarios.find((registro) => registro.usuario.email === email) ?? null;
  }

  async create(datos: {
    email: string;
    nombre: string;
    passwordHash: string;
    aceptoTerminosEn: Date;
  }): Promise<Usuario> {
    const usuario = new Usuario(`id-${this.usuarios.length + 1}`, datos.email, datos.nombre, datos.aceptoTerminosEn);
    this.usuarios.push({ usuario, passwordHash: datos.passwordHash });
    return usuario;
  }
}

class PasswordHasherFake implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return hash === `hashed:${plainPassword}`;
  }
}

describe('RegisterUsuarioUseCase', () => {
  let usuarioRepository: UsuarioRepositoryFake;
  let useCase: RegisterUsuarioUseCase;

  beforeEach(() => {
    usuarioRepository = new UsuarioRepositoryFake();
    useCase = new RegisterUsuarioUseCase(usuarioRepository, new PasswordHasherFake());
  });

  it('crea un usuario nuevo con la contraseña hasheada', async () => {
    const usuario = await useCase.execute({
      email: 'ana@example.com',
      nombre: 'Ana',
      password: 'secret123',
    });

    expect(usuario.email).toBe('ana@example.com');
    const registro = await usuarioRepository.findByEmail('ana@example.com');
    expect(registro?.passwordHash).toBe('hashed:secret123');
  });

  it('registra el momento de aceptación de los términos', async () => {
    const antes = new Date();
    const usuario = await useCase.execute({ email: 'ana@example.com', nombre: 'Ana', password: 'secret123' });

    expect(usuario.aceptoTerminosEn).not.toBeNull();
    expect((usuario.aceptoTerminosEn as Date).getTime()).toBeGreaterThanOrEqual(antes.getTime());
  });

  it('rechaza registrar dos veces el mismo email', async () => {
    await useCase.execute({ email: 'ana@example.com', nombre: 'Ana', password: 'secret123' });

    await expect(
      useCase.execute({ email: 'ana@example.com', nombre: 'Ana 2', password: 'otraClave' }),
    ).rejects.toThrow(DomainError);
  });
});
