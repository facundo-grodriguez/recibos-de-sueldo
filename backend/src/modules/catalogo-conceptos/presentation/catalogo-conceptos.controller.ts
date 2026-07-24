import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { DefinirConceptoCatalogoUseCase } from '../application/definir-concepto-catalogo.use-case';
import { ListarAuditoriaCatalogoConceptosUseCase } from '../application/listar-auditoria-catalogo-conceptos.use-case';
import { ListarConceptosSinClasificarUseCase } from '../application/listar-conceptos-sin-clasificar.use-case';
import { ListarCatalogoConceptosUseCase } from '../application/listar-catalogo-conceptos.use-case';
import { DefinirConceptoCatalogoDto, definirConceptoCatalogoSchema } from './dto/definir-concepto-catalogo.dto';
import { toAuditoriaConceptoCatalogoResponse, toConceptoCatalogoResponse } from './catalogo-conceptos.mapper';

@Controller('empresas/:empresaId')
@UseGuards(JwtAuthGuard)
export class CatalogoConceptosController {
  constructor(
    private readonly definirConceptoCatalogo: DefinirConceptoCatalogoUseCase,
    private readonly listarCatalogoConceptos: ListarCatalogoConceptosUseCase,
    private readonly listarConceptosSinClasificar: ListarConceptosSinClasificarUseCase,
    private readonly listarAuditoriaCatalogoConceptos: ListarAuditoriaCatalogoConceptosUseCase,
  ) {}

  @Post('conceptos')
  // Sin @Auditable: DefinirConceptoCatalogoUseCase ya registra su propia
  // entrada de auditoría, con el diff campo a campo (accion crear/modificar
  // + valorAnterior/valorNuevo) — el interceptor genérico solo sabe
  // registrar "crear" sin ese detalle, y duplicaría el registro.
  async definir(
    @Param('empresaId') empresaId: string,
    @Body(new ZodValidationPipe(definirConceptoCatalogoSchema)) dto: DefinirConceptoCatalogoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultado = await this.definirConceptoCatalogo.execute({
      empresaId,
      usuarioId: user.id,
      concepto: dto.concepto,
      tipo: dto.tipo,
      categoriaContribucion: dto.categoriaContribucion ?? null,
    });

    return {
      ...toConceptoCatalogoResponse(resultado.concepto),
      filasActualizadas: resultado.filasActualizadas,
    };
  }

  @Get('conceptos')
  async listar(@Param('empresaId') empresaId: string, @CurrentUser() user: AuthenticatedUser) {
    const conceptos = await this.listarCatalogoConceptos.execute({ empresaId, usuarioId: user.id });
    return conceptos.map(toConceptoCatalogoResponse);
  }

  @Get('conceptos/sin-clasificar')
  async listarSinClasificar(@Param('empresaId') empresaId: string, @CurrentUser() user: AuthenticatedUser) {
    const conceptos = await this.listarConceptosSinClasificar.execute({ empresaId, usuarioId: user.id });
    return { conceptos };
  }

  @Get('conceptos/:conceptoCatalogoId/auditoria')
  async auditoria(
    @Param('empresaId') empresaId: string,
    @Param('conceptoCatalogoId') conceptoCatalogoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const entradas = await this.listarAuditoriaCatalogoConceptos.execute({
      empresaId,
      usuarioId: user.id,
      conceptoCatalogoId,
    });
    return entradas.map(toAuditoriaConceptoCatalogoResponse);
  }
}
