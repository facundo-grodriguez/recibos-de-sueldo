import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Empleado, EstadoEmpleado } from '../domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../domain/empleado.repository';

export interface CambiarEstadoEmpleadoInput {
  empresaId: string;
  usuarioId: string;
  empleadoId: string;
  estado: EstadoEmpleado;
}

/**
 * "Baja" de un empleado nunca es un delete real: los recibos ya emitidos
 * referencian `empleadoId` para siempre (repositorio técnico, ADR-018). Este
 * caso de uso solo marca `estado:'inactivo'` — reversible con el mismo
 * endpoint pasando `'activo'`. El bloqueo real ("no emitir recibos nuevos
 * para un empleado inactivo") se refuerza en `EmitirRecibosUseCase`, no acá.
 */
@Injectable()
export class CambiarEstadoEmpleadoUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(EMPLEADO_REPOSITORY) private readonly empleadoRepository: EmpleadoRepository,
  ) {}

  async execute(input: CambiarEstadoEmpleadoInput): Promise<Empleado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const empleado = await this.empleadoRepository.findByIdAndEmpresa(input.empleadoId, empresa.id);
    if (!empleado) {
      throw new NotFoundError(`Empleado "${input.empleadoId}" no encontrado`);
    }

    return this.empleadoRepository.actualizar(empleado.id, { estado: input.estado });
  }
}
