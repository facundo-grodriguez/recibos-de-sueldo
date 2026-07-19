import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Empleado } from '../domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../domain/empleado.repository';

export interface ActualizarEmpleadoInput {
  empresaId: string;
  usuarioId: string;
  empleadoId: string;
  categoria?: string | null;
  fechaIngreso?: Date | null;
  legajo?: string | null;
  banco?: string | null;
}

@Injectable()
export class ActualizarEmpleadoUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
  ) {}

  async execute(input: ActualizarEmpleadoInput): Promise<Empleado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const empleado = await this.empleadoRepository.findByIdAndEmpresa(input.empleadoId, empresa.id);
    if (!empleado) {
      throw new NotFoundError(`Empleado "${input.empleadoId}" no encontrado`);
    }

    return this.empleadoRepository.actualizar(empleado.id, {
      categoria: input.categoria,
      fechaIngreso: input.fechaIngreso,
      legajo: input.legajo,
      banco: input.banco,
    });
  }
}
