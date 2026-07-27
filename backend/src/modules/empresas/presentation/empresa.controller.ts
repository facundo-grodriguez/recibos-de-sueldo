import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { Auditable } from '../../../infra/auditoria/auditable.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ActualizarEmpresaUseCase } from '../application/actualizar-empresa.use-case';
import { CrearEmpresaUseCase } from '../application/crear-empresa.use-case';
import { ListarEmpresasUseCase } from '../application/listar-empresas.use-case';
import { ObtenerLogoEmpresaUseCase } from '../application/obtener-logo-empresa.use-case';
import { SubirLogoEmpresaUseCase } from '../application/subir-logo-empresa.use-case';
import { ActualizarEmpresaDto, actualizarEmpresaSchema } from './dto/actualizar-empresa.dto';
import { CrearEmpresaDto, crearEmpresaSchema } from './dto/crear-empresa.dto';
import { toEmpresaResponse } from './empresa.mapper';

const TAMANIO_MAXIMO_LOGO_BYTES = 2 * 1024 * 1024;
const EXTENSION_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

@Controller('empresas')
@UseGuards(JwtAuthGuard)
export class EmpresaController {
  constructor(
    private readonly crearEmpresa: CrearEmpresaUseCase,
    private readonly listarEmpresas: ListarEmpresasUseCase,
    private readonly actualizarEmpresa: ActualizarEmpresaUseCase,
    private readonly subirLogoEmpresa: SubirLogoEmpresaUseCase,
    private readonly obtenerLogoEmpresa: ObtenerLogoEmpresaUseCase,
  ) {}

  @Post()
  @Auditable('Empresa')
  async create(
    @Body(new ZodValidationPipe(crearEmpresaSchema)) dto: CrearEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empresa = await this.crearEmpresa.execute({ ...dto, usuarioId: user.id });
    return toEmpresaResponse(empresa);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const empresas = await this.listarEmpresas.execute(user.id);
    return empresas.map(toEmpresaResponse);
  }

  @Patch(':id')
  @Auditable('Empresa', 'actualizar')
  async actualizar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(actualizarEmpresaSchema)) dto: ActualizarEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empresa = await this.actualizarEmpresa.execute({ ...dto, empresaId: id, usuarioId: user.id });
    return toEmpresaResponse(empresa);
  }

  @Post(':id/logo')
  @Auditable('Empresa', 'subirLogo')
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: TAMANIO_MAXIMO_LOGO_BYTES } }))
  async subirLogo(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo del logo (campo "logo")');
    }
    const extension = EXTENSION_POR_MIME[archivo.mimetype];
    if (!extension) {
      throw new BadRequestException('Formato de imagen no soportado — usá PNG, JPG, WEBP o SVG');
    }

    const empresa = await this.subirLogoEmpresa.execute({
      empresaId: id,
      usuarioId: user.id,
      extension,
      contenido: archivo.buffer,
    });
    return toEmpresaResponse(empresa);
  }

  @Get(':id/logo')
  async logo(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { contenido, mimeType } = await this.obtenerLogoEmpresa.execute({ empresaId: id, usuarioId: user.id });
    res.set({ 'Content-Type': mimeType });
    return new StreamableFile(contenido);
  }
}
