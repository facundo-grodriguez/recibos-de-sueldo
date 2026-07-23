import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Empleado } from '../domain/empleado.entity';
import { EMPLEADO_REPOSITORY, EmpleadoRepository } from '../domain/empleado.repository';

export interface ActualizarEmpleadoInput {
  empresaId: string;
  usuarioId: string;
  empleadoId: string;
  nombre?: string;
  apellido?: string;
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

    if (input.fechaIngreso && input.fechaIngreso > new Date()) {
      throw new DomainError('La fecha de ingreso no puede ser posterior a hoy');
    }

    if (input.legajo) {
      const otroConMismoLegajo = await this.empleadoRepository.findByLegajoAndEmpresa(empresa.id, input.legajo);
      if (otroConMismoLegajo && otroConMismoLegajo.id !== empleado.id) {
        throw new DomainError(
          `El legajo "${input.legajo}" ya está asignado a ${otroConMismoLegajo.apellido}, ${otroConMismoLegajo.nombre}`,
        );
      }
    }

    return this.empleadoRepository.actualizar(empleado.id, {
      nombre: input.nombre,
      apellido: input.apellido,
      categoria: input.categoria,
      fechaIngreso: input.fechaIngreso,
      legajo: input.legajo,
      banco: input.banco,
    });
  }
}
