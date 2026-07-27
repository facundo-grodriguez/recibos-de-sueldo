import { Body, Controller, Get, Param, Post, Query, Res, UseGuards, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { Auditable } from '../../../infra/auditoria/auditable.decorator';
import { construirContentDisposition } from '../../../shared/utils/content-disposition';
import { toImportacionFilaResponse } from '../../importacion/presentation/importacion.mapper';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { AnularReciboUseCase } from '../application/anular-recibo.use-case';
import { DescargarLoteRecibosUseCase } from '../application/descargar-lote-recibos.use-case';
import { DescargarReciboUseCase } from '../application/descargar-recibo.use-case';
import { EmitirRecibosUseCase } from '../application/emitir-recibos.use-case';
import { ListarAuditoriaReciboUseCase } from '../application/listar-auditoria-recibo.use-case';
import { ListarEmpleadosPendientesDeEmisionUseCase } from '../application/listar-empleados-pendientes-emision.use-case';
import { ListarRecibosUseCase } from '../application/listar-recibos.use-case';
import { PrevisualizarReemisionUseCase } from '../application/previsualizar-reemision.use-case';
import { ReemitirReciboUseCase } from '../application/reemitir-recibo.use-case';
import { nombreArchivoRecibo } from '../domain/nombre-archivo-recibo';
import { AnularReciboDto, anularReciboSchema } from './dto/anular-recibo.dto';
import { ReemitirReciboDto, reemitirReciboSchema } from './dto/reemitir-recibo.dto';
import { toAuditoriaReciboResponse, toReciboResponse } from './recibo.mapper';

@Controller('empresas/:empresaId/importaciones/:id/recibos')
@UseGuards(JwtAuthGuard)
export class EmisionController {
  constructor(
    private readonly emitirRecibos: EmitirRecibosUseCase,
    private readonly listarRecibos: ListarRecibosUseCase,
    private readonly descargarRecibo: DescargarReciboUseCase,
    private readonly anularRecibo: AnularReciboUseCase,
    private readonly reemitirRecibo: ReemitirReciboUseCase,
    private readonly previsualizarReemision: PrevisualizarReemisionUseCase,
    private readonly descargarLoteRecibos: DescargarLoteRecibosUseCase,
    private readonly listarAuditoriaRecibo: ListarAuditoriaReciboUseCase,
    private readonly listarEmpleadosPendientesDeEmision: ListarEmpleadosPendientesDeEmisionUseCase,
  ) {}

  @Post('emitir')
  // Sin @Auditable: EmitirRecibosUseCase ya registra la entrada de auditoría
  // "emitir" en la misma transacción que crea el recibo (ver ADR-066) — el
  // interceptor genérico la duplicaría.
  async emitir(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const recibos = await this.emitirRecibos.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });
    return recibos.map(toReciboResponse);
  }

  @Get()
  async listar(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Query('incluirAnulados') incluirAnulados: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const recibos = await this.listarRecibos.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
      incluirAnulados: incluirAnulados === 'true',
    });
    return recibos.map(toReciboResponse);
  }

  @Get(':reciboId/descargar')
  async descargar(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('reciboId') reciboId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { recibo, contenido } = await this.descargarRecibo.execute({
      importacionId: id,
      reciboId,
      empresaId,
      usuarioId: user.id,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': construirContentDisposition(nombreArchivoRecibo(recibo)),
    });
    return new StreamableFile(contenido);
  }

  @Get('pendientes')
  async pendientes(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empleados = await this.listarEmpleadosPendientesDeEmision.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });
    return empleados.map((empleado) => ({
      id: empleado.id,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      cuil: empleado.cuil.formatted,
    }));
  }

  @Get('descargar-lote')
  async descargarLote(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { contenido, nombreArchivo } = await this.descargarLoteRecibos.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    });
    return new StreamableFile(contenido);
  }

  @Post(':reciboId/anular')
  @Auditable('Recibo', 'anular')
  async anular(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('reciboId') reciboId: string,
    @Body(new ZodValidationPipe(anularReciboSchema)) dto: AnularReciboDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const recibo = await this.anularRecibo.execute({
      importacionId: id,
      reciboId,
      empresaId,
      usuarioId: user.id,
      motivo: dto.motivo,
    });
    return toReciboResponse(recibo);
  }

  @Get(':reciboId/auditoria')
  async auditoria(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('reciboId') reciboId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const entradas = await this.listarAuditoriaRecibo.execute({
      empresaId,
      importacionId: id,
      reciboId,
      usuarioId: user.id,
    });
    return entradas.map(toAuditoriaReciboResponse);
  }

  @Get(':reciboId/previsualizar-reemision')
  async previsualizarLaReemision(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('reciboId') reciboId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const filas = await this.previsualizarReemision.execute({
      importacionId: id,
      reciboId,
      empresaId,
      usuarioId: user.id,
    });
    return { filas: filas.map(toImportacionFilaResponse) };
  }

  @Post(':reciboId/reemitir')
  @Auditable('Recibo', 'reemitir')
  async reemitir(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('reciboId') reciboId: string,
    @Body(new ZodValidationPipe(reemitirReciboSchema)) dto: ReemitirReciboDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const recibo = await this.reemitirRecibo.execute({
      importacionId: id,
      reciboId,
      empresaId,
      usuarioId: user.id,
      ajustes: dto.ajustes,
    });
    return toReciboResponse(recibo);
  }
}
