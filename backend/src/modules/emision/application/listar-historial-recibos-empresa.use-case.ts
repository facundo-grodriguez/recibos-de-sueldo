import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Recibo } from '../domain/recibo.entity';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface ListarHistorialRecibosEmpresaInput {
  empresaId: string;
  usuarioId: string;
  /** Si se indica, acota el historial a un solo empleado. */
  empleadoId?: string;
}

/**
 * Historial completo de recibos de la empresa, cruzando todas sus
 * importaciones (vigentes y anulados, para poder ver la cadena de
 * reemplazos completa) — a diferencia de `ListarRecibosUseCase`, que se
 * limita a una importación puntual.
 */
@Injectable()
export class ListarHistorialRecibosEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
  ) {}

  async execute(input: ListarHistorialRecibosEmpresaInput): Promise<Recibo[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    return this.reciboRepository.findAllByEmpresa(empresa.id, { empleadoId: input.empleadoId });
  }
}
