import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

const CODIGO_RESTRICCION_UNICA = 'P2002';

/**
 * Red de seguridad para errores de Prisma que se escapan de un caso de uso.
 *
 * El ejemplo real que motivó este filtro: `RegisterUsuarioUseCase` verifica
 * "existe un usuario con este email" y recién después hace `create()` — dos
 * pasos separados, no atómicos. Bajo dos requests concurrentes con el mismo
 * email (ej. un doble click real del usuario), ambos pueden pasar la
 * verificación antes de que cualquiera confirme el insert, y el segundo
 * `create()` choca contra la restricción única de Postgres. Sin este filtro,
 * ese choque no es un `DomainError` (no lo captura `DomainExceptionFilter`)
 * y cae al 500 genérico de Nest — que no filtra información interna, pero
 * tampoco da un mensaje útil ni queda registrado con contexto.
 *
 * Nunca se resuelve el "quién ganó la carrera" en el código de cada caso de
 * uso (requeriría duplicar este manejo en cada `create`) — se centraliza acá,
 * igual que `DomainExceptionFilter`.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === CODIGO_RESTRICCION_UNICA) {
      this.logger.warn(`Restricción única violada (probable carrera concurrente): ${JSON.stringify(exception.meta)}`);
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'El recurso ya existe o fue modificado por otra solicitud al mismo tiempo. Volvé a intentar.',
      });
      return;
    }

    // Cualquier otro código de Prisma es un error real no anticipado: se
    // registra con el detalle técnico completo (nunca visible al cliente) y
    // se responde igual que el 500 genérico de Nest, sin filtrar internals.
    this.logger.error(`Error de Prisma no controlado (código ${exception.code})`, exception.stack);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
