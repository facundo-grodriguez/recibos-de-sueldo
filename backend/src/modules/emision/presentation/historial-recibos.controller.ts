import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ListarHistorialRecibosEmpresaUseCase } from '../application/listar-historial-recibos-empresa.use-case';
import { toReciboResponse } from './recibo.mapper';

@Controller('empresas/:empresaId/recibos')
@UseGuards(JwtAuthGuard)
export class HistorialRecibosController {
  constructor(private readonly listarHistorial: ListarHistorialRecibosEmpresaUseCase) {}

  @Get()
  async listar(
    @Param('empresaId') empresaId: string,
    @Query('empleadoId') empleadoId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const recibos = await this.listarHistorial.execute({
      empresaId,
      usuarioId: user.id,
      empleadoId,
    });
    return recibos.map(toReciboResponse);
  }
}
