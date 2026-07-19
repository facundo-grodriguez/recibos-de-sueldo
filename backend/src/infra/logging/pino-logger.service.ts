import { LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

/**
 * Logging estructurado (JSON) vía pino, en lugar del logger por defecto de Nest.
 * Nunca se loguean datos sensibles (CUIL/CUIT completos, passwords, tokens);
 * eso vive exclusivamente en AuditLog, que tiene su propio control de acceso.
 */
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
    });
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, String(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, String(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, String(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, String(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, String(message));
  }
}
