import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { Auditable } from '../../../infra/auditoria/auditable.decorator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { ActualizarEmpleadoUseCase } from '../application/actualizar-empleado.use-case';
import { CambiarEstadoEmpleadoUseCase } from '../application/cambiar-estado-empleado.use-case';
import { CrearEmpleadoUseCase } from '../application/crear-empleado.use-case';
import { ListarEmpleadosUseCase } from '../application/listar-empleados.use-case';
import { ActualizarEmpleadoDto, actualizarEmpleadoSchema } from './dto/actualizar-empleado.dto';
import { CambiarEstadoEmpleadoDto, cambiarEstadoEmpleadoSchema } from './dto/cambiar-estado-empleado.dto';
import { CrearEmpleadoDto, crearEmpleadoSchema } from './dto/crear-empleado.dto';
import { toEmpleadoResponse } from './empleado.mapper';

@Controller('empresas/:empresaId/empleados')
@UseGuards(JwtAuthGuard)
export class EmpleadoController {
  constructor(
    private readonly crearEmpleado: CrearEmpleadoUseCase,
    private readonly listarEmpleados: ListarEmpleadosUseCase,
    private readonly actualizarEmpleado: ActualizarEmpleadoUseCase,
    private readonly cambiarEstadoEmpleado: CambiarEstadoEmpleadoUseCase,
  ) {}

  @Post()
  @Auditable('Empleado')
  async create(
    @Param('empresaId') empresaId: string,
    @Body(new ZodValidationPipe(crearEmpleadoSchema)) dto: CrearEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empleado = await this.crearEmpleado.execute({ ...dto, empresaId, usuarioId: user.id });
    return toEmpleadoResponse(empleado);
  }

  @Get()
  async findAll(@Param('empresaId') empresaId: string, @CurrentUser() user: AuthenticatedUser) {
    const empleados = await this.listarEmpleados.execute({ empresaId, usuarioId: user.id });
    return empleados.map(toEmpleadoResponse);
  }

  @Patch(':id')
  @Auditable('Empleado', 'actualizar')
  async actualizar(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(actualizarEmpleadoSchema)) dto: ActualizarEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empleado = await this.actualizarEmpleado.execute({
      empresaId,
      usuarioId: user.id,
      empleadoId: id,
      nombre: dto.nombre,
      apellido: dto.apellido,
      categoria: dto.categoria,
      fechaIngreso: dto.fechaIngreso,
      legajo: dto.legajo,
      banco: dto.banco,
    });
    return toEmpleadoResponse(empleado);
  }

  @Patch(':id/estado')
  @Auditable('Empleado', 'cambiarEstado')
  async cambiarEstado(
    @Param('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cambiarEstadoEmpleadoSchema)) dto: CambiarEstadoEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const empleado = await this.cambiarEstadoEmpleado.execute({
      empresaId,
      usuarioId: user.id,
      empleadoId: id,
      estado: dto.estado,
    });
    return toEmpleadoResponse(empleado);
  }
}
