import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { ALMACENAMIENTO_LOGO, AlmacenamientoLogo, mimeTypeDeExtension } from '../domain/almacenamiento-logo';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../domain/empresa.repository';

export interface ObtenerLogoEmpresaInput {
  empresaId: string;
  usuarioId: string;
}

export interface LogoEmpresa {
  contenido: Buffer;
  mimeType: string;
}

@Injectable()
export class ObtenerLogoEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(ALMACENAMIENTO_LOGO) private readonly almacenamiento: AlmacenamientoLogo,
  ) {}

  async execute(input: ObtenerLogoEmpresaInput): Promise<LogoEmpresa> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }
    if (!empresa.logoPath) {
      throw new NotFoundError('Esta empresa todavía no tiene un logo cargado');
    }

    const contenido = await this.almacenamiento.leer(empresa.logoPath);
    const extension = empresa.logoPath.split('.').pop() ?? '';
    return { contenido, mimeType: mimeTypeDeExtension(extension) };
  }
}
