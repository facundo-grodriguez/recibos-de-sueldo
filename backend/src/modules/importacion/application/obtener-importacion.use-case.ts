import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { Importacion } from '../domain/importacion.entity';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../domain/importacion.repository';

export interface ObtenerImportacionInput {
  importacionId: string;
  empresaId: string;
  usuarioId: string;
}

export interface ObtenerImportacionResultado {
  importacion: Importacion;
  /** Etapa 3: aviso (no bloqueo) si ya existe otra importación de esta empresa para el mismo período. */
  hayOtraImportacionEnMismoPeriodo: boolean;
}

@Injectable()
export class ObtenerImportacionUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
  ) {}

  async execute(input: ObtenerImportacionInput): Promise<ObtenerImportacionResultado> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const hayOtraImportacionEnMismoPeriodo = await this.importacionRepository.existeOtraEnMismoPeriodo(
      empresa.id,
      importacion.anio,
      importacion.mes,
      importacion.id,
    );

    return { importacion, hayOtraImportacionEnMismoPeriodo };
  }
}
