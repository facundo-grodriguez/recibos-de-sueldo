import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { Empresa } from '../domain/empresa.entity';
import { ActualizarEmpresaData, EMPRESA_REPOSITORY, EmpresaRepository } from '../domain/empresa.repository';

export interface ActualizarEmpresaInput extends ActualizarEmpresaData {
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ActualizarEmpresaUseCase {
  constructor(@Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository) {}

  async execute(input: ActualizarEmpresaInput): Promise<Empresa> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    return this.empresaRepository.actualizar(empresa.id, {
      razonSocial: input.razonSocial,
      cuit: input.cuit,
      nombreFantasia: input.nombreFantasia,
      domicilio: input.domicilio,
      localidad: input.localidad,
      provincia: input.provincia,
      codigoPostal: input.codigoPostal,
    });
  }
}
