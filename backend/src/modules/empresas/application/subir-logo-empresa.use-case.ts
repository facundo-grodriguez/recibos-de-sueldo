import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ALMACENAMIENTO_LOGO, AlmacenamientoLogo } from '../domain/almacenamiento-logo';
import { Empresa } from '../domain/empresa.entity';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../domain/empresa.repository';

export interface SubirLogoEmpresaInput {
  empresaId: string;
  usuarioId: string;
  extension: string;
  contenido: Buffer;
}

@Injectable()
export class SubirLogoEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(ALMACENAMIENTO_LOGO) private readonly almacenamiento: AlmacenamientoLogo,
  ) {}

  async execute(input: SubirLogoEmpresaInput): Promise<Empresa> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const logoPath = await this.almacenamiento.guardar({
      empresaId: empresa.id,
      extension: input.extension,
      contenido: input.contenido,
    });

    return this.empresaRepository.actualizarLogo(empresa.id, logoPath);
  }
}
