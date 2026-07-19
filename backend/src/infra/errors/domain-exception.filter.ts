import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../shared/errors/domain-error';
import { NotFoundError } from '../../shared/errors/not-found-error';

/**
 * Mapeo transversal de errores de Dominio a HTTP (un solo lugar, no repetido
 * en cada controller). Nunca se filtran detalles internos (stack, queries).
 */
@Catch(DomainError, NotFoundError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError | NotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof NotFoundError ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
    });
  }
}
