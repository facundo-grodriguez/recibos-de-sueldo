import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { Auditable } from '../../../infra/auditoria/auditable.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { DefinirMapeoConceptoUseCase } from '../application/definir-mapeo-concepto.use-case';
import { ListarConceptosSinMapearUseCase } from '../application/listar-conceptos-sin-mapear.use-case';
import { ListarMapeosUseCase } from '../application/listar-mapeos.use-case';
import { DefinirMapeoDto, definirMapeoSchema } from './dto/definir-mapeo.dto';
import { toPerfilMapeoResponse } from './mapeo.mapper';

@Controller('empresas/:empresaId')
@UseGuards(JwtAuthGuard)
export class MapeoController {
  constructor(
    private readonly definirMapeoConcepto: DefinirMapeoConceptoUseCase,
    private readonly listarMapeos: ListarMapeosUseCase,
    private readonly listarConceptosSinMapear: ListarConceptosSinMapearUseCase,
  ) {}

  @Post('conceptos-mapeados')
  @Auditable('PerfilMapeoConcepto')
  async definir(
    @Param('empresaId') empresaId: string,
    @Body(new ZodValidationPipe(definirMapeoSchema)) dto: DefinirMapeoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultado = await this.definirMapeoConcepto.execute({
      empresaId,
      usuarioId: user.id,
      concepto: dto.concepto,
      tipo: dto.tipo,
      categoriaContribucion: dto.categoriaContribucion ?? null,
    });

    return {
      ...toPerfilMapeoResponse(resultado.perfil),
      filasActualizadas: resultado.filasActualizadas,
    };
  }

  @Get('conceptos-mapeados')
  async listar(@Param('empresaId') empresaId: string, @CurrentUser() user: AuthenticatedUser) {
    const perfiles = await this.listarMapeos.execute({ empresaId, usuarioId: user.id });
    return perfiles.map(toPerfilMapeoResponse);
  }

  @Get('conceptos-sin-mapear')
  async listarSinMapear(@Param('empresaId') empresaId: string, @CurrentUser() user: AuthenticatedUser) {
    const conceptos = await this.listarConceptosSinMapear.execute({ empresaId, usuarioId: user.id });
    return { conceptos };
  }
}
