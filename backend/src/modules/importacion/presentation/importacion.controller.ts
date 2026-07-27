import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { Auditable } from '../../../infra/auditoria/auditable.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ActualizarDatosEmisionUseCase } from '../application/actualizar-datos-emision.use-case';
import { ConfirmarImportacionUseCase } from '../application/confirmar-importacion.use-case';
import { CorregirFilaImportacionUseCase } from '../application/corregir-fila-importacion.use-case';
import { DescartarImportacionUseCase } from '../application/descartar-importacion.use-case';
import { ImportarArchivoUseCase } from '../application/importar-archivo.use-case';
import { ListarImportacionesUseCase } from '../application/listar-importaciones.use-case';
import { ObtenerImportacionUseCase } from '../application/obtener-importacion.use-case';
import {
  ActualizarDatosEmisionDto,
  actualizarDatosEmisionSchema,
} from './dto/actualizar-datos-emision.dto';
import { CorregirFilaImportacionDto, corregirFilaImportacionSchema } from './dto/corregir-fila-importacion.dto';
import { CrearImportacionDto, crearImportacionSchema } from './dto/crear-importacion.dto';
import { toImportacionResponse, toImportacionResumenResponse } from './importacion.mapper';

const TAMANIO_MAXIMO_ARCHIVO_BYTES = 5 * 1024 * 1024;

@Controller('empresas/:empresaId/importaciones')
@UseGuards(JwtAuthGuard)
export class ImportacionController {
  constructor(
    private readonly importarArchivo: ImportarArchivoUseCase,
    private readonly confirmarImportacion: ConfirmarImportacionUseCase,
    private readonly obtenerImportacion: ObtenerImportacionUseCase,
    private readonly listarImportaciones: ListarImportacionesUseCase,
    private readonly actualizarDatosEmision: ActualizarDatosEmisionUseCase,
    private readonly corregirFilaImportacion: CorregirFilaImportacionUseCase,
    private readonly descartarImportacion: DescartarImportacionUseCase,
  ) {}

  @Post()
  @Auditable('Importacion')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANIO_MAXIMO_ARCHIVO_BYTES } }))
  async create(
    @Param('empresaId') empresaId: string,
    @Body(new ZodValidationPipe(crearImportacionSchema)) dto: CrearImportacionDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo a importar (campo "archivo")');
    }

    const importacion = await this.importarArchivo.execute({
      empresaId,
      usuarioId: user.id,
      anio: dto.anio,
      mes: dto.mes,
      nombreArchivo: archivo.originalname,
      contenido: archivo.buffer,
    });
    return toImportacionResponse(importacion);
  }

  @Get()
  async findAll(@Param('empresaId') empresaId: string, @CurrentUser() user: AuthenticatedUser) {
    const importaciones = await this.listarImportaciones.execute({ empresaId, usuarioId: user.id });
    return importaciones.map(toImportacionResumenResponse);
  }

  @Get(':id')
  async findOne(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { importacion, hayOtraImportacionEnMismoPeriodo, conceptosCatalogados } = await this.obtenerImportacion.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });
    return toImportacionResponse(importacion, hayOtraImportacionEnMismoPeriodo, conceptosCatalogados);
  }

  @Post(':id/confirmar')
  @Auditable('Importacion', 'confirmar')
  async confirmar(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const importacion = await this.confirmarImportacion.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });
    return toImportacionResponse(importacion);
  }

  @Post(':id/descartar')
  @Auditable('Importacion', 'descartar')
  async descartar(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const importacion = await this.descartarImportacion.execute({
      importacionId: id,
      empresaId,
      usuarioId: user.id,
    });
    return toImportacionResponse(importacion);
  }

  @Patch(':id/datos-emision')
  @Auditable('Importacion', 'actualizarDatosEmision')
  async actualizarDatosEmisionEndpoint(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(actualizarDatosEmisionSchema)) dto: ActualizarDatosEmisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const importacion = await this.actualizarDatosEmision.execute({
      empresaId,
      usuarioId: user.id,
      importacionId: id,
      fechaPago: dto.fechaPago,
      lugarPago: dto.lugarPago,
      fechaPagoCargasSociales: dto.fechaPagoCargasSociales,
      lugarPagoCargasSociales: dto.lugarPagoCargasSociales,
    });
    return toImportacionResponse(importacion);
  }

  @Patch(':id/filas/:filaId')
  @Auditable('Importacion', 'corregirFila')
  async corregirFila(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('filaId') filaId: string,
    @Body(new ZodValidationPipe(corregirFilaImportacionSchema)) dto: CorregirFilaImportacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const importacion = await this.corregirFilaImportacion.execute({
      empresaId,
      usuarioId: user.id,
      importacionId: id,
      filaId,
      cambios: dto,
    });
    return toImportacionResponse(importacion);
  }
}
