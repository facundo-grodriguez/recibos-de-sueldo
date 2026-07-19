import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PASSWORD_HASHER, PasswordHasher } from '../domain/password-hasher';
import { TOKEN_ISSUER, TokenIssuer } from '../domain/token-issuer';
import { USUARIO_REPOSITORY, UsuarioRepository } from '../domain/usuario.repository';

export interface LoginUsuarioInput {
  email: string;
  password: string;
}

export interface LoginUsuarioOutput {
  accessToken: string;
}

const CREDENCIALES_INVALIDAS = 'Email o contraseña incorrectos';

@Injectable()
export class LoginUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
  ) {}

  async execute(input: LoginUsuarioInput): Promise<LoginUsuarioOutput> {
    const registro = await this.usuarioRepository.findByEmail(input.email);
    if (!registro) {
      // Mensaje genérico: no revelar si el email existe o no.
      throw new DomainError(CREDENCIALES_INVALIDAS);
    }

    const passwordValido = await this.passwordHasher.verify(registro.passwordHash, input.password);
    if (!passwordValido) {
      throw new DomainError(CREDENCIALES_INVALIDAS);
    }

    const accessToken = this.tokenIssuer.issue({
      usuarioId: registro.usuario.id,
      email: registro.usuario.email,
    });

    return { accessToken };
  }
}
