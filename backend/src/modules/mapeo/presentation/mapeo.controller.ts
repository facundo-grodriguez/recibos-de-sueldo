import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { DefinirMapeoConceptoUseCase } from '../application/definir-mapeo-concepto.use-case';
import { ListarAuditoriaMapeoUseCase } from '../application/listar-auditoria-mapeo.use-case';
import { ListarConceptosSinMapearUseCase } from '../application/listar-conceptos-sin-mapear.use-case';
import { ListarMapeosUseCase } from '../application/listar-mapeos.use-case';
import { DefinirMapeoDto, definirMapeoSchema } from './dto/definir-mapeo.dto';
import { toAuditoriaMapeoResponse, toPerfilMapeoResponse } from './mapeo.mapper';

@Controller('empresas/:empresaId')
@UseGuards(JwtAuthGuard)
export class MapeoController {
  constructor(
    private readonly definirMapeoConcepto: DefinirMapeoConceptoUseCase,
    private readonly listarMapeos: ListarMapeosUseCase,
    private readonly listarConceptosSinMapear: ListarConceptosSinMapearUseCase,
    private readonly listarAuditoriaMapeo: ListarAuditoriaMapeoUseCase,
  ) {}

  @Post('conceptos-mapeados')
  // Sin @Auditable: DefinirMapeoConceptoUseCase ya registra su propia
  // entrada de auditoría, con el diff campo a campo (accion crear/modificar
  // + valorAnterior/valorNuevo) — el interceptor genérico solo sabe
  // registrar "crear" sin ese detalle, y duplicaría el registro.
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

  @Get('conceptos-mapeados/:perfilMapeoId/auditoria')
  async auditoria(
    @Param('empresaId') empresaId: string,
    @Param('perfilMapeoId') perfilMapeoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const entradas = await this.listarAuditoriaMapeo.execute({ empresaId, usuarioId: user.id, perfilMapeoId });
    return entradas.map(toAuditoriaMapeoResponse);
  }
}
