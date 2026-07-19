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
    @Query('pagina') pagina: string | undefined,
    @Query('porPagina') porPagina: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultado = await this.listarHistorial.execute({
      empresaId,
      usuarioId: user.id,
      empleadoId,
      pagina: pagina ? Number(pagina) : undefined,
      porPagina: porPagina ? Number(porPagina) : undefined,
    });
    return {
      recibos: resultado.recibos.map(toReciboResponse),
      total: resultado.total,
      pagina: resultado.pagina,
      porPagina: resultado.porPagina,
    };
  }
}
