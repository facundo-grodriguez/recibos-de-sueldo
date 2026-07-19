import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ValidarImportacionUseCase } from '../application/validar-importacion.use-case';
import { toValidacionResponse } from './validacion.mapper';

@Controller('empresas/:empresaId/importaciones/:id/validacion')
@UseGuards(JwtAuthGuard)
export class ValidacionController {
  constructor(private readonly validarImportacion: ValidarImportacionUseCase) {}

  // De solo lectura: se recalcula en cada pedido, nunca se persiste ni se audita.
  @Get()
  async validar(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultado = await this.validarImportacion.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });
    return toValidacionResponse(resultado);
  }
}
