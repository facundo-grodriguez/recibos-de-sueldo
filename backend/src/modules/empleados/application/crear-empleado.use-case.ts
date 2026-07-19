import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { Cuil } from '../../../shared/value-objects/cuil';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Empleado } from '../domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../domain/empleado.repository';

export interface CrearEmpleadoInput {
  empresaId: string;
  usuarioId: string;
  nombre: string;
  apellido: string;
  cuil: string;
}

@Injectable()
export class CrearEmpleadoUseCase {
  constructor(
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
  ) {}

  async execute(input: CrearEmpleadoInput): Promise<Empleado> {
    // Autorización: la empresa debe existir y pertenecer al usuario autenticado.
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const cuil = Cuil.create(input.cuil);

    return this.empleadoRepository.create({
      empresaId: empresa.id,
      nombre: input.nombre,
      apellido: input.apellido,
      cuil: cuil.value,
    });
  }
}
