import { forwardRef, Module } from '@nestjs/common';
import { EmpresaModule } from '../empresas/empresa.module';
import { ImportacionModule } from '../importacion/importacion.module';
import { DefinirMapeoConceptoUseCase } from './application/definir-mapeo-concepto.use-case';
import { ListarConceptosSinMapearUseCase } from './application/listar-conceptos-sin-mapear.use-case';
import { ListarMapeosUseCase } from './application/listar-mapeos.use-case';
import { PERFIL_MAPEO_REPOSITORY } from './domain/perfil-mapeo.repository';
import { PrismaPerfilMapeoRepository } from './infrastructure/prisma-perfil-mapeo.repository';
import { MapeoController } from './presentation/mapeo.controller';

// Mapeo necesita leer/escribir filas de Importación (backfill retroactivo) e
// Importación necesita consultar el perfil de Mapeo al confirmar (auto-
// clasificación) — dependencia mutua legítima, resuelta con forwardRef()
// (mecanismo estándar de NestJS para este caso, ver ADR correspondiente).
@Module({
  imports: [EmpresaModule, forwardRef(() => ImportacionModule)],
  controllers: [MapeoController],
  providers: [
    DefinirMapeoConceptoUseCase,
    ListarMapeosUseCase,
    ListarConceptosSinMapearUseCase,
    { provide: PERFIL_MAPEO_REPOSITORY, useClass: PrismaPerfilMapeoRepository },
  ],
  exports: [PERFIL_MAPEO_REPOSITORY],
})
export class MapeoModule {}
