import { forwardRef, Module } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../infra/auditoria/audit-log.repository';
import { PrismaAuditLogRepository } from '../../infra/auditoria/prisma-audit-log.repository';
import { EmpresaModule } from '../empresas/empresa.module';
import { ImportacionModule } from '../importacion/importacion.module';
import { DefinirConceptoCatalogoUseCase } from './application/definir-concepto-catalogo.use-case';
import { ListarAuditoriaCatalogoConceptosUseCase } from './application/listar-auditoria-catalogo-conceptos.use-case';
import { ListarConceptosSinClasificarUseCase } from './application/listar-conceptos-sin-clasificar.use-case';
import { ListarCatalogoConceptosUseCase } from './application/listar-catalogo-conceptos.use-case';
import { CATALOGO_CONCEPTOS_REPOSITORY } from './domain/concepto-catalogo.repository';
import { PrismaConceptoCatalogoRepository } from './infrastructure/prisma-concepto-catalogo.repository';
import { CatalogoConceptosController } from './presentation/catalogo-conceptos.controller';

// CatalogoConceptos necesita leer/escribir filas de Importación (backfill
// retroactivo) e Importación necesita consultar el catálogo al confirmar
// (auto-clasificación) — dependencia mutua legítima, resuelta con
// forwardRef() (mecanismo estándar de NestJS para este caso, ver ADR
// correspondiente).
@Module({
  imports: [EmpresaModule, forwardRef(() => ImportacionModule)],
  controllers: [CatalogoConceptosController],
  providers: [
    DefinirConceptoCatalogoUseCase,
    ListarCatalogoConceptosUseCase,
    ListarConceptosSinClasificarUseCase,
    ListarAuditoriaCatalogoConceptosUseCase,
    { provide: CATALOGO_CONCEPTOS_REPOSITORY, useClass: PrismaConceptoCatalogoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
  exports: [CATALOGO_CONCEPTOS_REPOSITORY],
})
export class CatalogoConceptosModule {}
