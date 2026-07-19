import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Importacion } from '../domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';

export interface ActualizarDatosEmisionInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  fechaPago?: Date;
  lugarPago?: string;
  fechaPagoCargasSociales?: Date;
  lugarPagoCargasSociales?: string;
}

@Injectable()
export class ActualizarDatosEmisionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
  ) {}

  async execute(input: ActualizarDatosEmisionInput): Promise<Importacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    return this.importacionRepository.actualizarDatosEmision(importacion.id, {
      fechaPago: input.fechaPago,
      lugarPago: input.lugarPago,
      fechaPagoCargasSociales: input.fechaPagoCargasSociales,
      lugarPagoCargasSociales: input.lugarPagoCargasSociales,
    });
  }
}
