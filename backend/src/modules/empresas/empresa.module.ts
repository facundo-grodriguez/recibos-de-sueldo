import { Module } from '@nestjs/common';
import { ActualizarEmpresaUseCase } from './application/actualizar-empresa.use-case';
import { CrearEmpresaUseCase } from './application/crear-empresa.use-case';
import { ListarEmpresasUseCase } from './application/listar-empresas.use-case';
import { EMPRESA_REPOSITORY } from './domain/empresa.repository';
import { PrismaEmpresaRepository } from './infrastructure/prisma-empresa.repository';
import { EmpresaController } from './presentation/empresa.controller';

@Module({
  controllers: [EmpresaController],
  providers: [
    CrearEmpresaUseCase,
    ListarEmpresasUseCase,
    ActualizarEmpresaUseCase,
    { provide: EMPRESA_REPOSITORY, useClass: PrismaEmpresaRepository },
  ],
  exports: [EMPRESA_REPOSITORY],
})
export class EmpresaModule {}
