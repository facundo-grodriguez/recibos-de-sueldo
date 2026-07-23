import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginUsuarioUseCase } from '../application/login-usuario.use-case';
import { RegisterUsuarioUseCase } from '../application/register-usuario.use-case';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { AdminRegistrationGuard } from './admin-registration.guard';
import { LoginDto, loginSchema } from './dto/login.dto';
import { RegisterDto, registerSchema } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUsuario: RegisterUsuarioUseCase,
    private readonly loginUsuario: LoginUsuarioUseCase,
  ) {}

  // Cerrado al público (Tarea 5 del plan de piloto): sin el header
  // `X-Admin-Registration-Token` correcto, no se crea ninguna cuenta. Ver
  // AdminRegistrationGuard y OPERACION.md para el procedimiento real.
  @Post('register')
  @UseGuards(AdminRegistrationGuard)
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    const usuario = await this.registerUsuario.execute(dto);
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      aceptoTerminosEn: usuario.aceptoTerminosEn?.toISOString() ?? null,
    };
  }

  // Límite propio, más estricto que el default global (ThrottlerModule en
  // app.module.ts): 5 intentos por minuto por IP — el único guard real hoy
  // contra fuerza bruta de una password de 8 caracteres sin bloqueo de cuenta.
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.loginUsuario.execute(dto);
  }
}
