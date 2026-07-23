import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const HEADER_TOKEN_ADMIN = 'x-admin-registration-token';

/**
 * Cierra `POST /auth/register` al público (Tarea 5 del plan de piloto): el
 * endpoint ya no crea una cuenta con solo conocer la URL — hace falta el
 * token de administración en el header. Alcance deliberadamente mínimo: es
 * quien opera la instancia (vos) el que crea cada cuenta nueva (la del
 * estudio piloto, o una propia), no un formulario de alta público. El
 * procedimiento completo para crear/resetear una cuenta vive en `OPERACION.md`.
 */
@Injectable()
export class AdminRegistrationGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tokenRecibido = request.headers[HEADER_TOKEN_ADMIN];
    const tokenEsperado = this.configService.getOrThrow<string>('ADMIN_REGISTRATION_TOKEN');

    if (typeof tokenRecibido !== 'string' || !coincideEnTiempoConstante(tokenRecibido, tokenEsperado)) {
      throw new ForbiddenException('Registro no disponible');
    }

    return true;
  }
}

/**
 * Compara dos strings sin filtrar por temporización cuánto coinciden
 * (`===` corta apenas encuentra la primera diferencia) — evita que alguien
 * adivine el token byte a byte midiendo tiempos de respuesta.
 */
function coincideEnTiempoConstante(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    // timingSafeEqual exige buffers del mismo largo; comparar igual contra
    // sí mismo (siempre falso al final) para no filtrar el largo esperado
    // devolviendo distinto según la longitud recibida.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
