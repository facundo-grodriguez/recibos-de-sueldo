import { Inject, Injectable } from '@nestjs/common';
import { AuditLogEntry, AUDIT_LOG_REPOSITORY, AuditLogRepository } from '../../../infra/auditoria/audit-log.repository';
import { NotFoundError } from '../../../shared/errors/not-found-error';
import { EMPRESA_REPOSITORY, EmpresaRepository } from '../../empresas/domain/empresa.repository';
import { CATALOGO_CONCEPTOS_REPOSITORY, ConceptoCatalogoRepository } from '../domain/concepto-catalogo.repository';

export interface ListarAuditoriaCatalogoConceptosInput {
  empresaId: string;
  usuarioId: string;
  conceptoCatalogoId: string;
}

/** Historial de cambios de clasificación de un concepto del catálogo (ver ADR-058/064). */
@Injectable()
export class ListarAuditoriaCatalogoConceptosUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY) private readonly empresaRepository: EmpresaRepository,
    @Inject(CATALOGO_CONCEPTOS_REPOSITORY) private readonly catalogoConceptosRepository: ConceptoCatalogoRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: ListarAuditoriaCatalogoConceptosInput): Promise<AuditLogEntry[]> {
    const empresa = await this.empresaRepository.findByIdAndUsuario(input.empresaId, input.usuarioId);
    if (!empresa) {
      throw new NotFoundError(`Empresa "${input.empresaId}" no encontrada`);
    }

    const concepto = await this.catalogoConceptosRepository.findByIdAndEmpresa(input.conceptoCatalogoId, empresa.id);
    if (!concepto) {
      throw new NotFoundError(`Concepto del catálogo "${input.conceptoCatalogoId}" no encontrado`);
    }

    // Ver nota en DefinirConceptoCatalogoUseCase: 'PerfilMapeoConcepto' es el
    // valor histórico persistido en `entidad`, no se renombra.
    return this.auditLogRepository.findByEntidad('PerfilMapeoConcepto', concepto.id);
  }
}
