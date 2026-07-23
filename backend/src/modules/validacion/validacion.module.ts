import { Module } from '@nestjs/common';
import { EmpleadoModule } from '../empleados/empleado.module';
import { EmpresaModule } from '../empresas/empresa.module';
import { ImportacionModule } from '../importacion/importacion.module';
import { ValidarImportacionUseCase } from './application/validar-importacion.use-case';
import { ValidacionController } from './presentation/validacion.controller';

@Module({
  imports: [EmpresaModule, ImportacionModule, EmpleadoModule],
  controllers: [ValidacionController],
  providers: [ValidarImportacionUseCase],
  exports: [ValidarImportacionUseCase],
})
export class ValidacionModule {}
