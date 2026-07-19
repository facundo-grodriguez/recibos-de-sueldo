import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../src/shared/errors/domain-error';
import { LoginUsuarioUseCase } from '../../src/modules/auth/application/login-usuario.use-case';
import { PasswordHasher } from '../../src/modules/auth/domain/password-hasher';
import { TokenIssuer } from '../../src/modules/auth/domain/token-issuer';
import { Usuario } from '../../src/modules/auth/domain/usuario.entity';
import { UsuarioRepository } from '../../src/modules/auth/domain/usuario.repository';

class UsuarioRepositoryFake implements UsuarioRepository {
  private registro: { usuario: Usuario; passwordHash: string } | null = null;

  seed(usuario: Usuario, passwordHash: string): void {
    this.registro = { usuario, passwordHash };
  }

  async findByEmail(email: string) {
    if (this.registro?.usuario.email === email) {
      return this.registro;
    }
    return null;
  }

  async create(): Promise<Usuario> {
    throw new Error('no usado en este test');
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

class TokenIssuerFake implements TokenIssuer {
  issue(payload: { usuarioId: string; email: string }): string {
    return `token-for:${payload.usuarioId}`;
  }
}

describe('LoginUsuarioUseCase', () => {
  let usuarioRepository: UsuarioRepositoryFake;
  let useCase: LoginUsuarioUseCase;

  beforeEach(() => {
    usuarioRepository = new UsuarioRepositoryFake();
    useCase = new LoginUsuarioUseCase(
      usuarioRepository,
      new PasswordHasherFake(),
      new TokenIssuerFake(),
    );
  });

  it('devuelve un token cuando las credenciales son correctas', async () => {
    const usuario = new Usuario('u1', 'ana@example.com', 'Ana');
    usuarioRepository.seed(usuario, 'hashed:secret123');

    const result = await useCase.execute({ email: 'ana@example.com', password: 'secret123' });

    expect(result.accessToken).toBe('token-for:u1');
  });

  it('rechaza un email inexistente sin revelar que no existe', async () => {
    await expect(
      useCase.execute({ email: 'nadie@example.com', password: 'x' }),
    ).rejects.toThrow(DomainError);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const usuario = new Usuario('u1', 'ana@example.com', 'Ana');
    usuarioRepository.seed(usuario, 'hashed:secret123');

    await expect(
      useCase.execute({ email: 'ana@example.com', password: 'incorrecta' }),
    ).rejects.toThrow(DomainError);
  });
});
