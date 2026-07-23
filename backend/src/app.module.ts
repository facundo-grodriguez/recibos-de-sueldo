import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { PrismaExceptionFilter } from './infra/errors/prisma-exception.filter';
import { HealthModule } from './infra/health/health.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Límite global por defecto (defensa en profundidad); /auth/login lleva
    // un límite más estricto propio (ver auth.controller.ts) — es el
    // endpoint que la Tarea 5 del plan de piloto pide proteger de fuerza
    // bruta, ya que ahí sí importa: password de 8 caracteres, sin bloqueo
    // de cuenta.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
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
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
