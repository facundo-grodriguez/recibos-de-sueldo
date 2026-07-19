import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { Auditable } from '../../../infra/auditoria/auditable.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ActualizarEmpresaUseCase } from '../application/actualizar-empresa.use-case';
import { CrearEmpresaUseCase } from '../application/crear-empresa.use-case';
import { ListarEmpresasUseCase } from '../application/listar-empresas.use-case';
import { ActualizarEmpresaDto, actualizarEmpresaSchema } from './dto/actualizar-empresa.dto';
import { CrearEmpresaDto, crearEmpresaSchema } from './dto/crear-empresa.dto';
import { toEmpresaResponse } from './empresa.mapper';

@Controller('empresas')
@UseGuards(JwtAuthGuard)
export class EmpresaController {
  constructor(
    private readonly crearEmpresa: CrearEmpresaUseCase,
    private readonly listarEmpresas: ListarEmpresasUseCase,
    private readonly actualizarEmpresa: ActualizarEmpresaUseCase,
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
}
