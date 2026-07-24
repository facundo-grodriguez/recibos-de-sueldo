import { forwardRef, Module } from '@nestjs/common';
import { EmpleadoModule } from '../empleados/empleado.module';
import { EmpresaModule } from '../empresas/empresa.module';
import { CatalogoConceptosModule } from '../catalogo-conceptos/catalogo-conceptos.module';
import { ActualizarDatosEmisionUseCase } from './application/actualizar-datos-emision.use-case';
import { ConfirmarImportacionUseCase } from './application/confirmar-importacion.use-case';
import { CorregirFilaImportacionUseCase } from './application/corregir-fila-importacion.use-case';
import { DescartarImportacionUseCase } from './application/descartar-importacion.use-case';
import { ImportarArchivoUseCase } from './application/importar-archivo.use-case';
import { ListarImportacionesUseCase } from './application/listar-importaciones.use-case';
import { ObtenerImportacionUseCase } from './application/obtener-importacion.use-case';
import { CONECTOR_IMPORTACION_EXCEL } from './domain/conector-importacion';
import { IMPORTACION_REPOSITORY } from './domain/importacion.repository';
import { ExcelConectorImportacion } from './infrastructure/excel-conector-importacion';
import { PrismaImportacionRepository } from './infrastructure/prisma-importacion.repository';
import { ImportacionController } from './presentation/importacion.controller';

@Module({
  imports: [EmpresaModule, EmpleadoModule, forwardRef(() => CatalogoConceptosModule)],
  controllers: [ImportacionController],
  providers: [
    ImportarArchivoUseCase,
    ConfirmarImportacionUseCase,
    ObtenerImportacionUseCase,
    ListarImportacionesUseCase,
    ActualizarDatosEmisionUseCase,
    CorregirFilaImportacionUseCase,
    DescartarImportacionUseCase,
    { provide: IMPORTACION_REPOSITORY, useClass: PrismaImportacionRepository },
    { provide: CONECTOR_IMPORTACION_EXCEL, useClass: ExcelConectorImportacion },
  ],
  exports: [IMPORTACION_REPOSITORY],
})
export class ImportacionModule {}
