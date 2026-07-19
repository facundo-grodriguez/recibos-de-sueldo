import { Module } from '@nestjs/common';
import { EmpresaModule } from '../empresas/empresa.module';
import { ImportacionModule } from '../importacion/importacion.module';
import { ValidarImportacionUseCase } from './application/validar-importacion.use-case';
import { ValidacionController } from './presentation/validacion.controller';

@Module({
  imports: [EmpresaModule, ImportacionModule],
  controllers: [ValidacionController],
  providers: [ValidarImportacionUseCase],
  exports: [ValidarImportacionUseCase],
})
export class ValidacionModule {}
