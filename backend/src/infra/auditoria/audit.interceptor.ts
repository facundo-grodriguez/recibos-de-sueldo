import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../db/prisma.service';
import { AUDITABLE_METADATA_KEY, AuditableMetadata } from './auditable.decorator';

interface AuthenticatedUser {
  id: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

interface MutatedResult {
  id?: string;
}

const METHOD_TO_ACCION: Record<string, string> = {
  POST: 'crear',
  PUT: 'modificar',
  PATCH: 'modificar',
  DELETE: 'eliminar',
};

/**
 * Auditoría transversal (ver docs/constitucion-tecnica.md, fuera de este repo):
 * intercepta endpoints marcados con @Auditable y registra la mutación en AuditLog,
 * en vez de que cada módulo escriba su propio log de auditoría disperso.
 *
 * Fase 0-1: registra quién/cuándo/qué entidad/qué acción. El diff de valor
 * anterior/nuevo campo a campo se incorpora cuando existan casos de uso de
 * edición de un campo puntual.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditableMetadata | undefined>(
      AUDITABLE_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithUser>();
    const accion = metadata.accion ?? METHOD_TO_ACCION[request.method] ?? 'modificar';

    return next.handle().pipe(
      tap((result: MutatedResult | MutatedResult[]) => {
        // Algunos endpoints emiten en lote (ej. POST .../recibos/emitir
        // devuelve un array): cada elemento del lote es una entidad propia y
        // necesita su propio registro de auditoría, no uno solo por request.
        const resultados = Array.isArray(result) ? result : [result];
        for (const resultado of resultados) {
          void this.registrar(metadata.entidad, accion, request.user?.id, resultado?.id);
        }
      }),
    );
  }

  private async registrar(
    entidad: string,
    accion: string,
    usuarioId: string | undefined,
    entidadId: string | undefined,
  ): Promise<void> {
    if (!entidadId) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        usuarioId,
        entidad,
        entidadId,
        accion,
      },
    });
  }
}
