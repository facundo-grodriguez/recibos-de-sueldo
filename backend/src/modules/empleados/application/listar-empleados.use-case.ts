import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Empleado } from '../domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../domain/empleado.repository';

export interface ListarEmpleadosInput {
  empresaId: string;
  usuarioId: string;
}

@Injectable()
export class ListarEmpleadosUseCase {
  constructor(
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
  ) {}

  async execute(input: ListarEmpleadosInput): Promise<Empleado[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    return this.empleadoRepository.findAllByEmpresa(empresa.id);
  }
}
