import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { EmisionModule } from './modules/emision/emision.module';
import { EmpleadoModule } from './modules/empleados/empleado.module';
import { EmpresaModule } from './modules/empresas/empresa.module';
import { ImportacionModule } from './modules/importacion/importacion.module';
import { MapeoModule } from './modules/mapeo/mapeo.module';
import { ValidacionModule } from './modules/validacion/validacion.module';
import { ConfigModule } from './infra/config/config.module';
import { PrismaModule } from './infra/db/prisma.module';
import { AuditInterceptor } from './infra/auditoria/audit.interceptor';
import { DomainExceptionFilter } from './infra/errors/domain-exception.filter';
import { HealthModule } from './infra/health/health.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    EmpresaModule,
    EmpleadoModule,
    ImportacionModule,
    MapeoModule,
    ValidacionModule,
    EmisionModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
