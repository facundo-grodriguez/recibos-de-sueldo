import { Module } from '@nestjs/common';
import { AUDIT_LOG_REPOSITORY } from '../../infra/auditoria/audit-log.repository';
import { PrismaAuditLogRepository } from '../../infra/auditoria/prisma-audit-log.repository';
import { EmpleadoModule } from '../empleados/empleado.module';
import { EmpresaModule } from '../empresas/empresa.module';
import { ImportacionModule } from '../importacion/importacion.module';
import { ValidacionModule } from '../validacion/validacion.module';
import { AnularReciboUseCase } from './application/anular-recibo.use-case';
import { DescargarLoteRecibosUseCase } from './application/descargar-lote-recibos.use-case';
import { DescargarReciboUseCase } from './application/descargar-recibo.use-case';
import { EmitirRecibosUseCase } from './application/emitir-recibos.use-case';
import { ListarAuditoriaReciboUseCase } from './application/listar-auditoria-recibo.use-case';
import { ListarHistorialRecibosEmpresaUseCase } from './application/listar-historial-recibos-empresa.use-case';
import { ListarRecibosUseCase } from './application/listar-recibos.use-case';
import { PrevisualizarReemisionUseCase } from './application/previsualizar-reemision.use-case';
import { ReemitirReciboUseCase } from './application/reemitir-recibo.use-case';
import { ALMACENAMIENTO_RECIBOS } from './domain/almacenamiento-recibos';
import { EMPAQUETADOR_ZIP } from './domain/empaquetador-zip';
import { GENERADOR_PDF } from './domain/generador-pdf';
import { RECIBO_REPOSITORY } from './domain/recibo.repository';
import { ArchiverEmpaquetadorZip } from './infrastructure/archiver-empaquetador-zip';
import { FilesystemAlmacenamientoRecibos } from './infrastructure/filesystem-almacenamiento-recibos';
import { PrismaReciboRepository } from './infrastructure/prisma-recibo.repository';
import { PuppeteerGeneradorPdf } from './infrastructure/puppeteer-generador-pdf';
import { EmisionController } from './presentation/emision.controller';
import { HistorialRecibosController } from './presentation/historial-recibos.controller';

@Module({
  imports: [EmpresaModule, EmpleadoModule, ImportacionModule, ValidacionModule],
  controllers: [EmisionController, HistorialRecibosController],
  providers: [
    EmitirRecibosUseCase,
    ListarRecibosUseCase,
    DescargarReciboUseCase,
    AnularReciboUseCase,
    ReemitirReciboUseCase,
    PrevisualizarReemisionUseCase,
    DescargarLoteRecibosUseCase,
    ListarHistorialRecibosEmpresaUseCase,
    ListarAuditoriaReciboUseCase,
    { provide: RECIBO_REPOSITORY, useClass: PrismaReciboRepository },
    { provide: GENERADOR_PDF, useClass: PuppeteerGeneradorPdf },
    { provide: ALMACENAMIENTO_RECIBOS, useClass: FilesystemAlmacenamientoRecibos },
    { provide: EMPAQUETADOR_ZIP, useClass: ArchiverEmpaquetadorZip },
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
})
export class EmisionModule {}
