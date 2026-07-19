import { Module } from '@nestjs/common';
import { EmpresaModule } from '../empresas/empresa.module';
import { ActualizarEmpleadoUseCase } from './application/actualizar-empleado.use-case';
import { CambiarEstadoEmpleadoUseCase } from './application/cambiar-estado-empleado.use-case';
import { CrearEmpleadoUseCase } from './application/crear-empleado.use-case';
import { ListarEmpleadosUseCase } from './application/listar-empleados.use-case';
import { EMPLEADO_REPOSITORY } from './domain/empleado.repository';
import { PrismaEmpleadoRepository } from './infrastructure/prisma-empleado.repository';
import { EmpleadoController } from './presentation/empleado.controller';

@Module({
  imports: [EmpresaModule],
  controllers: [EmpleadoController],
  providers: [
    CrearEmpleadoUseCase,
    ListarEmpleadosUseCase,
    ActualizarEmpleadoUseCase,
    CambiarEstadoEmpleadoUseCase,
    { provide: EMPLEADO_REPOSITORY, useClass: PrismaEmpleadoRepository },
  ],
  exports: [EMPLEADO_REPOSITORY],
})
export class EmpleadoModule {}
