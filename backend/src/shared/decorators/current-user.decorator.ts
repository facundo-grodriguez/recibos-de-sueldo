import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Extrae el usuario autenticado (seteado por JwtStrategy) en los controllers,
 * en vez de acceder al Request crudo en cada endpoint.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new Error('CurrentUser usado fuera de una ruta protegida por JwtAuthGuard');
    }
    return request.user;
  },
);
