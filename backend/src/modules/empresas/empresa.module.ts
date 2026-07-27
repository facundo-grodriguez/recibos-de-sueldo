import { Module } from '@nestjs/common';
import { ActualizarEmpresaUseCase } from './application/actualizar-empresa.use-case';
import { CrearEmpresaUseCase } from './application/crear-empresa.use-case';
import { ListarEmpresasUseCase } from './application/listar-empresas.use-case';
import { ObtenerLogoEmpresaUseCase } from './application/obtener-logo-empresa.use-case';
import { SubirLogoEmpresaUseCase } from './application/subir-logo-empresa.use-case';
import { ALMACENAMIENTO_LOGO } from './domain/almacenamiento-logo';
import { EMPRESA_REPOSITORY } from './domain/empresa.repository';
import { FilesystemAlmacenamientoLogo } from './infrastructure/filesystem-almacenamiento-logo';
import { PrismaEmpresaRepository } from './infrastructure/prisma-empresa.repository';
import { EmpresaController } from './presentation/empresa.controller';

@Module({
  controllers: [EmpresaController],
  providers: [
    CrearEmpresaUseCase,
    ListarEmpresasUseCase,
    ActualizarEmpresaUseCase,
    SubirLogoEmpresaUseCase,
    ObtenerLogoEmpresaUseCase,
    { provide: EMPRESA_REPOSITORY, useClass: PrismaEmpresaRepository },
    { provide: ALMACENAMIENTO_LOGO, useClass: FilesystemAlmacenamientoLogo },
  ],
  // ALMACENAMIENTO_LOGO se exporta para que EmisionModule pueda leer el logo
  // vigente al armar el snapshot de un recibo (ver EmitirRecibosUseCase).
  exports: [EMPRESA_REPOSITORY, ALMACENAMIENTO_LOGO],
})
export class EmpresaModule {}
