import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PASSWORD_HASHER, PasswordHasher } from '../domain/password-hasher';
import { Usuario } from '../domain/usuario.entity';
import { USUARIO_REPOSITORY, UsuarioRepository } from '../domain/usuario.repository';

export interface RegisterUsuarioInput {
  email: string;
  nombre: string;
  password: string;
}

@Injectable()
export class RegisterUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarioRepository: UsuarioRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUsuarioInput): Promise<Usuario> {
    const existente = await this.usuarioRepository.findByEmail(input.email);
    if (existente) {
      throw new DomainError(`Ya existe un usuario registrado con el email "${input.email}"`);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    // El DTO de presentación ya exige aceptaTerminos === true antes de llegar
    // acá (ver register.dto.ts); registrarse implica aceptar en ese mismo momento.
    return this.usuarioRepository.create({
      email: input.email,
      nombre: input.nombre,
      passwordHash,
      aceptoTerminosEn: new Date(),
    });
  }
}
