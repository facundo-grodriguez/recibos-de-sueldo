import { Inject, Injectable } from '@nestjs/common';
import { AuditLogEntry, AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../infra/auditoria/audit-log.repository';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { PERFIL_MAPEO_REPOSITORY, PerfilMapeoRepository } from '../domain/perfil-mapeo.repository';

export interface ListarAuditoriaMapeoInput {
  empresaId: string;
  usuarioId: string;
  perfilMapeoId: string;
}

/** Historial de cambios de clasificación de un concepto del catálogo (ver ADR-058/064). */
@Injectable()
export class ListarAuditoriaMapeoUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(PERFIL_MAPEO_REPOSITORY) private readonly perfilMapeoRepository: PerfilMapeoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ListarAuditoriaMapeoInput): Promise<AuditLogEntry[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const perfil = await this.perfilMapeoRepository.findByIdAndEmpresa(input.perfilMapeoId, empresa.id);
    if (!perfil) {
      throw new NotFoundError(`Concepto mapeado "${input.perfilMapeoId}" no encontrado`);
    }

    return this.auditLogRepository.findByEntidad('PerfilMapeoConcepto', perfil.id);
  }
}
