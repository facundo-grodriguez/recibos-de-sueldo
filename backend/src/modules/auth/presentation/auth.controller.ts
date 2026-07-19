import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginUsuarioUseCase } from '../application/login-usuario.use-case';
import { RegisterUsuarioUseCase } from '../application/register-usuario.use-case';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { LoginDto, loginSchema } from './dto/login.dto';
import { RegisterDto, registerSchema } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUsuario: RegisterUsuarioUseCase,
    private readonly loginUsuario: LoginUsuarioUseCase,
  ) {}

  @Post('register')
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.loginUsuario.execute(dto);
  }
}
