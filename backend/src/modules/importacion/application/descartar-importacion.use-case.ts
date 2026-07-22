import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Importacion } from '../domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';

export interface DescartarImportacionInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

/**
 * Etapa 3 (recuperación de errores): el contador empezó a importar el archivo/período equivocado
 * y quiere sacarlo de la vista activa. Nunca borra nada — solo cambia el estado, igual que
 * `ConfirmarImportacionUseCase`. Bloqueado si ya está confirmada: una vez confirmada, ya pudo haber
 * generado empleados/recibos, y "descartarla" dejaría de tener el mismo significado.
 */
@Injectable()
export class DescartarImportacionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
  ) {}

  async execute(input: DescartarImportacionInput): Promise<Importacion> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    if (importacion.estado !== 'previsualizada') {
      throw new DomainError(`No se puede descartar: la importación ya está en estado "${importacion.estado}"`);
    }

    return this.importacionRepository.marcarDescartada(importacion.id);
  }
}
