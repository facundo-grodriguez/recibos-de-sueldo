import { Inject, Injectable } from '@nestjs/common';
import { AuditLogEntry, AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../infra/auditoria/audit-log.repository';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { IMPORTACION_REPOSITORY, ImportacionRepository } from '../../importacion/domain/importacion.repository';
import { RECIBO_REPOSITORY, ReciboRepository } from '../domain/recibo.repository';

export interface ListarAuditoriaReciboInput {
  empresaId: string;
  usuarioId: string;
  importacionId: string;
  reciboId: string;
}

@Injectable()
export class ListarAuditoriaReciboUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(IMPORTACION_REPOSITORY) private readonly importacionRepository: ImportacionRepository,
    @Inject(RECIBO_REPOSITORY) private readonly reciboRepository: ReciboRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ListarAuditoriaReciboInput): Promise<AuditLogEntry[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const importacion = await this.importacionRepository.findByIdAndEmpresa(input.importacionId, empresa.id);
    if (!importacion) {
      throw new NotFoundError(`Importación "${input.importacionId}" no encontrada`);
    }

    const recibo = await this.reciboRepository.findByIdAndImportacion(input.reciboId, importacion.id);
    if (!recibo) {
      throw new NotFoundError(`Recibo "${input.reciboId}" no encontrado`);
    }

    return this.auditLogRepository.findByEntidad('Recibo', recibo.id);
  }
}
