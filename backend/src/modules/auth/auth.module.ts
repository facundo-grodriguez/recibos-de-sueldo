import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LoginUsuarioUseCase } from './application/login-usuario.use-case';
import { RegisterUsuarioUseCase } from './application/register-usuario.use-case';
import { PASSWORD_HASHER } from './domain/password-hasher';
import { TOKEN_ISSUER } from './domain/token-issuer';
import { USUARIO_REPOSITORY } from './domain/usuario.repository';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { JwtTokenIssuer } from './infrastructure/jwt-token-issuer';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUsuarioUseCase,
    LoginUsuarioUseCase,
    JwtStrategy,
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
})
export class AuthModule {}
